import { deliverableInputSchema, deliverableListSchema } from "@/validations/deliverable";
import {
  createTenantContext,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import {
  createDeliverable,
  listDeliverables,
  getDeliverableStats,
} from "@/server/services/deliverables";
import { failure, requestId, success } from "@/server/api/response";

export const runtime = "nodejs";

export const deliverableError = (e: unknown, rid: string) => {
  const rawCode = e instanceof Error ? e.message : "DELIVERABLE_ERROR";
  let status = 400;
  let code = rawCode;
  let message = "Unable to process deliverable request.";

  if (rawCode.startsWith("INVALID_STATUS_TRANSITION")) {
    code = "INVALID_STATUS_TRANSITION";
    message = rawCode;
  } else if (rawCode.startsWith("FILE_TOO_LARGE")) {
    code = "FILE_TOO_LARGE";
    message = rawCode;
  } else if (rawCode.startsWith("INVALID_FILE_SIZE")) {
    code = "INVALID_FILE_SIZE";
    message = rawCode;
  } else if (rawCode.startsWith("REVIEW_FORBIDDEN")) {
    code = "REVIEW_FORBIDDEN";
    status = 403;
    message = rawCode;
  } else if (rawCode.startsWith("CANNOT_SELF_APPROVE")) {
    code = "CANNOT_SELF_APPROVE";
    status = 403;
    message = rawCode;
  } else {
    switch (rawCode) {
      case "UNAUTHENTICATED":
        status = 401;
        message = "You must be signed in to perform this action.";
        break;
      case "WORKSPACE_ARCHIVED":
      case "PROJECT_ARCHIVED":
      case "DELIVERABLE_ARCHIVED":
        status = 409;
        message =
          "Cannot modify records in an archived workspace, project, or deliverable.";
        break;
      case "WORKSPACE_FORBIDDEN":
      case "DELIVERABLE_FORBIDDEN":
        status = 403;
        message = "You do not have permission for this deliverable operation.";
        break;
      case "DELIVERABLE_NOT_FOUND":
        status = 404;
        message = "Deliverable not found.";
        break;
      case "PROJECT_NOT_FOUND":
        status = 404;
        message = "The selected project was not found in this workspace.";
        break;
      case "MILESTONE_NOT_FOUND":
        status = 404;
        message = "The selected milestone was not found for this project.";
        break;
      case "FILE_NOT_FOUND":
        status = 404;
        message = "File not found.";
        break;
      case "INVALID_WORKSPACE_MEMBER":
        status = 400;
        message =
          "One or more contributors or reviewers are not active workspace members.";
        break;
      case "STORAGE_NOT_CONFIGURED":
        status = 503;
        message =
          "File storage provider is not configured. Live upload/download is blocked.";
        break;
      default:
        if (e instanceof Error && e.name === "ZodError") {
          status = 400;
          message = "Invalid deliverable data provided.";
        }
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

    const { searchParams } = new URL(request.url);
    const parsedArgs = deliverableListSchema.parse({
      status: searchParams.get("status") || "all",
      projectId: searchParams.get("projectId") || undefined,
      milestoneId: searchParams.get("milestoneId") || undefined,
      search: searchParams.get("search") || undefined,
      view: searchParams.get("view") || "active",
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    });

    const [data, stats] = await Promise.all([
      listDeliverables(ctx.organizationId, ctx.userId, parsedArgs, ctx.role),
      getDeliverableStats(ctx.organizationId, parsedArgs.projectId),
    ]);

    return success({ ...data, stats }, rid);
  } catch (e) {
    return deliverableError(e, rid);
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
    requireWorkspaceActive(ctx);

    const body = await request.json();
    const parsed = deliverableInputSchema.parse(body);

    const created = await createDeliverable(ctx.organizationId, ctx.userId, parsed);
    return success(created, rid, 201);
  } catch (e) {
    return deliverableError(e, rid);
  }
}
