import { taskStatusUpdateSchema } from "@/validations/task";
import {
  createTenantContext,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { updateTaskStatus } from "@/server/services/tasks";
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
    await requireWorkspaceActive(ctx);

    const memberUserId =
      ctx.role === "owner" || ctx.role === "admin" ? undefined : ctx.userId;

    const body = await request.json();
    const { status } = taskStatusUpdateSchema.parse(body);

    const updated = await updateTaskStatus(
      ctx.organizationId,
      ctx.userId,
      taskId,
      status,
      memberUserId,
    );

    return success(updated, rid);
  } catch (e) {
    const code = e instanceof Error ? e.message : "TASK_ERROR";
    return failure(
      code,
      "Unable to update task status.",
      rid,
      code === "UNAUTHENTICATED"
        ? 401
        : code === "TASK_FORBIDDEN"
          ? 403
          : code === "TASK_NOT_FOUND"
            ? 404
            : 400,
    );
  }
}
