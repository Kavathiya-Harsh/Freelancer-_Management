import { taskInputSchema, taskListSchema } from "@/validations/task";
import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { createTask, listTasks } from "@/server/services/tasks";
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
      message = "Cannot create or modify tasks in an archived workspace or project.";
      break;
    case "WORKSPACE_FORBIDDEN":
    case "TASK_FORBIDDEN":
      status = 403;
      message = "You do not have permission for this task operation.";
      break;
    case "TASK_NOT_FOUND":
      status = 404;
      message = "Task not found.";
      break;
    case "PROJECT_NOT_FOUND":
      status = 404;
      message = "The selected project does not exist in this workspace.";
      break;
    case "INVALID_ASSIGNEE":
      status = 400;
      message = "One or more assignees are not members of this workspace.";
      break;
    case "ASSIGNEE_NOT_IN_PROJECT":
      status = 400;
      message = "One or more assignees are not assigned to this project.";
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
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug } = await params;
    const ctx = await createTenantContext(workspaceSlug, rid);

    // Owners and Admins view all tasks; Members only view permitted tasks
    const memberUserId =
      ctx.role === "owner" || ctx.role === "admin" ? undefined : ctx.userId;

    const url = new URL(request.url);
    const input = taskListSchema.parse(Object.fromEntries(url.searchParams));

    const result = await listTasks(ctx.organizationId, input, memberUserId);
    return success(result, rid);
  } catch (e) {
    return taskError(e, rid);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug } = await params;
    const ctx = await createTenantContext(workspaceSlug, rid);
    requirePermission(await requireWorkspaceActive(ctx), ["owner", "admin"]);

    const body = await request.json();
    const validated = taskInputSchema.parse(body);

    const task = await createTask(ctx.organizationId, ctx.userId, validated);
    return success(task, rid, 201);
  } catch (e) {
    return taskError(e, rid);
  }
}
