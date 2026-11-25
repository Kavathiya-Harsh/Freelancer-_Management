import { taskUpdateSchema } from "@/validations/task";
import {
  createTenantContext,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { getTaskById, updateTask } from "@/server/services/tasks";
import { failure, requestId, success } from "@/server/api/response";

export const runtime = "nodejs";

const taskError = (e: unknown, rid: string) => {
  const code = e instanceof Error ? e.message : "TASK_ERROR";
  let status = 400;
  let message = "Unable to process task request.";

  switch (code) {
    case "UNAUTHENTICATED":
      status = 401;
      message = "You must be signed in to perform this action.";
      break;
    case "WORKSPACE_ARCHIVED":
    case "PROJECT_ARCHIVED":
      status = 409;
      message = "Cannot modify tasks in an archived workspace or project.";
      break;
    case "WORKSPACE_FORBIDDEN":
    case "TASK_FORBIDDEN":
      status = 403;
      message = "You do not have permission to modify this task.";
      break;
    case "TASK_NOT_FOUND":
      status = 404;
      message = "Task not found.";
      break;
    case "PROJECT_NOT_FOUND":
      status = 404;
      message = "Project not found.";
      break;
    case "INVALID_ASSIGNEE":
      status = 400;
      message = "One or more assignees are not members of this workspace.";
      break;
    default:
      if (e instanceof Error && e.name === "ZodError") {
        status = 400;
        message = "Invalid task data provided.";
      }
  }

  return failure(code, message, rid, status);
};

export async function GET(
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

    const memberUserId =
      ctx.role === "owner" || ctx.role === "admin" ? undefined : ctx.userId;

    const task = await getTaskById(ctx.organizationId, taskId, memberUserId);
    return success(task, rid);
  } catch (e) {
    return taskError(e, rid);
  }
}

export async function PATCH(
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
    const validated = taskUpdateSchema.parse(body);

    const updated = await updateTask(
      ctx.organizationId,
      ctx.userId,
      taskId,
      validated,
      memberUserId,
    );

    return success(updated, rid);
  } catch (e) {
    return taskError(e, rid);
  }
}
