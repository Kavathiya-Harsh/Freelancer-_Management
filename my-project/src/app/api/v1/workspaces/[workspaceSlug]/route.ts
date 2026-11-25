import { z } from "zod";
import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { canRestoreWorkspace } from "@/server/authorization/lifecycle-policy";
import { failure, requestId, success } from "@/server/api/response";

export const runtime = "nodejs";
const statusSchema = z.object({ status: z.enum(["archived", "active"]) });

function routeError(error: unknown, id: string) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "UNAUTHENTICATED")
    return failure(code, "Authentication is required.", id, 401);
  if (code === "WORKSPACE_NOT_FOUND")
    return failure(code, "Workspace not found.", id, 404);
  if (code === "WORKSPACE_NOT_PROVISIONED")
    return failure(code, "Workspace is not provisioned.", id, 403);
  if (code === "WORKSPACE_ARCHIVED")
    return failure(code, "Workspace is archived.", id, 409);
  return failure(
    "FORBIDDEN",
    "You do not have permission to perform this action.",
    id,
    403,
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const id = requestId(request);
  try {
    const context = await createTenantContext((await params).workspaceSlug, id);
    return success(
      {
        workspace: {
          slug: context.workspaceSlug,
          organizationId: context.organizationId,
          status: context.workspaceStatus,
        },
        role: context.role,
      },
      id,
    );
  } catch (error) {
    return routeError(error, id);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const id = requestId(request);
  try {
    const context = await createTenantContext((await params).workspaceSlug, id);
    const { status } = statusSchema.parse(await request.json());
    if (status === "archived") requirePermission(context, ["owner"]);
    if (status === "active" && !canRestoreWorkspace(context.role))
      throw new Error("WORKSPACE_FORBIDDEN");
    if (status === "archived") await requireWorkspaceActive(context);
    const { getMongoDb } = await import("@/server/db/mongo-client");
    const db = await getMongoDb();
    const updateDoc =
      status === "archived"
        ? { status, archivedAt: new Date(), archivedByUserId: context.userId, updatedAt: new Date() }
        : { status, archivedAt: null, archivedByUserId: null, updatedAt: new Date() };
    const lifecycle = await db.collection("workspaceLifecycles").findOneAndUpdate(
      { organizationId: context.organizationId },
      { $set: updateDoc },
      { returnDocument: "after" },
    );
    return success(lifecycle, id);
  } catch (error) {
    if (error instanceof z.ZodError)
      return failure("VALIDATION_ERROR", "Invalid lifecycle status.", id, 422);
    return routeError(error, id);
  }
}
