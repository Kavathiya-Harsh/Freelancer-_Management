import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/server/auth/auth";
import { getMongoDb } from "@/server/db/mongo-client";
import { getWorkspaceLifecycle } from "@/server/services/workspace-lifecycle";
import { provisionWorkspace } from "@/server/services/workspace-provisioning";
import { failure, requestId, success } from "@/server/api/response";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session)
      return failure("UNAUTHENTICATED", "Authentication is required.", id, 401);
    const db = await getMongoDb();
    const uid = session.user.id;
    const userQuery = ObjectId.isValid(uid) ? { $in: [uid, new ObjectId(uid)] } : uid;
    const memberships = await db
      .collection("member")
      .find({ userId: userQuery })
      .toArray();
    const organizationIds = memberships.map((member) => member.organizationId);
    const orgObjIds = organizationIds
      .filter((oid) => typeof oid === "string" && ObjectId.isValid(oid))
      .map((oid) => new ObjectId(oid));
    const organizations = await db
      .collection("organization")
      .find({
        $or: [
          { id: { $in: organizationIds } },
          { _id: { $in: [...organizationIds, ...orgObjIds] } },
        ],
      })
      .toArray();
    const data = await Promise.all(
      organizations.map(async (organization) => {
        const orgIdStr = (organization.id ?? organization._id.toString()) as string;
        const membership = memberships.find(
          (member) =>
            member.organizationId === orgIdStr ||
            member.organizationId?.toString() === organization._id?.toString(),
        );
        return {
          id: orgIdStr,
          name: organization.name,
          slug: organization.slug,
          role: membership?.role ?? "owner",
          lifecycle: (await getWorkspaceLifecycle(orgIdStr))?.status ?? "unprovisioned",
        };
      }),
    );
    return success(data, id);
  } catch (err) {
    console.error("GET /api/v1/workspaces error:", err);
    return failure("SERVICE_UNAVAILABLE", "Unable to load workspaces.", id, 503);
  }
}

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session)
      return failure("UNAUTHENTICATED", "Authentication is required.", id, 401);
    await enforceRateLimit("workspace-create", session.user.id);
    const input = createSchema.parse(await request.json());
    const organization = await auth.api.createOrganization({
      body: input,
      headers: await headers(),
    });
    const orgId =
      organization?.id ?? (organization as Record<string, unknown>)?._id?.toString();
    if (orgId) {
      await provisionWorkspace(orgId);
    }
    return success(
      { id: orgId, name: organization.name, slug: organization.slug },
      id,
      201,
    );
  } catch (error) {
    console.error("Workspace creation failed:", error);
    if (error instanceof z.ZodError)
      return failure("VALIDATION_ERROR", "Invalid workspace details.", id, 422);
    if (error instanceof Error && error.message === "RATE_LIMITED")
      return failure("RATE_LIMITED", "Too many requests.", id, 429);
    if (error instanceof Error && error.message === "RATE_LIMIT_UNAVAILABLE")
      return failure("SERVICE_UNAVAILABLE", "Rate limiting is unavailable.", id, 503);
    const message =
      error instanceof Error ? error.message : "Unable to create workspace.";
    return failure("WORKSPACE_CREATE_FAILED", message, id, 400);
  }
}
