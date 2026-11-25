import { headers } from "next/headers";
import { auth } from "@/server/auth/auth";
import { getMongoDb } from "@/server/db/mongo-client";
import { provisionWorkspace } from "@/server/services/workspace-provisioning";
import { failure, requestId, success } from "@/server/api/response";

export const runtime = "nodejs";

/** Owner-only recovery for an organization created before lifecycle provisioning completed. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const id = requestId(request);
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session)
      return failure("UNAUTHENTICATED", "Authentication is required.", id, 401);
    const db = await getMongoDb();
    const organization = await db
      .collection("organization")
      .findOne({ slug: (await params).workspaceSlug });
    if (!organization)
      return failure("WORKSPACE_NOT_FOUND", "Workspace not found.", id, 404);
    const membership = await db
      .collection("member")
      .findOne({ organizationId: organization.id, userId: session.user.id });
    if (!membership?.role?.split(",").includes("owner"))
      return failure(
        "FORBIDDEN",
        "Only a workspace owner can recover provisioning.",
        id,
        403,
      );
    const provisioned = await provisionWorkspace(organization.id);
    return success(
      { organizationId: organization.id, status: provisioned.lifecycle?.status ?? "active" },
      id,
    );
  } catch {
    return failure(
      "PROVISIONING_FAILED",
      "Unable to recover workspace provisioning.",
      id,
      503,
    );
  }
}
