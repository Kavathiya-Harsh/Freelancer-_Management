import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { archiveTask } from "@/server/services/tasks";
import { failure, requestId, success } from "@/server/api/response";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ workspaceSlug: string; taskId: string }>;
  },
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug, taskId } = await params;
    const ctx = await createTenantContext(workspaceSlug, rid);
    requirePermission(await requireWorkspaceActive(ctx), ["owner", "admin"]);

    const archived = await archiveTask(ctx.organizationId, ctx.userId, taskId);
    return success(archived, rid);
  } catch (e) {
    const code = e instanceof Error ? e.message : "TASK_ERROR";
    return failure(
      code,
      "Unable to archive task.",
      rid,
      code === "UNAUTHENTICATED"
        ? 401
        : code === "WORKSPACE_FORBIDDEN"
          ? 403
          : code === "TASK_NOT_FOUND"
            ? 404
            : 400,
    );
  }
}
