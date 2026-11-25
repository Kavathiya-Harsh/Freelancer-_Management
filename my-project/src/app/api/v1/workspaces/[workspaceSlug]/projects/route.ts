import { projectInputSchema, projectListSchema } from "@/validations/project";
import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import {
  createProject,
  getProjectStatistics,
  listProjects,
} from "@/server/services/projects";
import { failure, requestId, success } from "@/server/api/response";

export const runtime = "nodejs";

const projectError = (e: unknown, rid: string) => {
  const code = e instanceof Error ? e.message : "PROJECT_ERROR";
  let status = 400;
  let message = "Unable to process project request.";

  switch (code) {
    case "UNAUTHENTICATED":
      status = 401;
      message = "You must be signed in to perform this action.";
      break;
    case "WORKSPACE_ARCHIVED":
      status = 409;
      message = "This workspace is archived and cannot be modified.";
      break;
    case "WORKSPACE_FORBIDDEN":
    case "PROJECT_FORBIDDEN":
      status = 403;
      message = "You do not have permission for this project operation.";
      break;
    case "PROJECT_NOT_FOUND":
      status = 404;
      message = "Project not found.";
      break;
    case "CLIENT_NOT_FOUND":
      status = 404;
      message = "The selected client does not exist.";
      break;
    case "CLIENT_ARCHIVED":
      status = 409;
      message = "Cannot create or assign projects to an archived client.";
      break;
    case "PROJECT_CODE_EXISTS":
      status = 409;
      message = "A project with this project code already exists in this workspace.";
      break;
    case "INVALID_MEMBER":
      status = 400;
      message = "One or more assigned members are not members of this workspace.";
      break;
    case "INVALID_DATE_RANGE":
      status = 400;
      message = "Deadline must be on or after start date.";
      break;
    default:
      if (e instanceof Error && e.name === "ZodError") {
        status = 400;
        message = "Invalid project data provided.";
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

    // Owners and Admins see all projects; Members only see assigned projects
    const memberUserId =
      ctx.role === "owner" || ctx.role === "admin" ? undefined : ctx.userId;

    const url = new URL(request.url);
    const searchParamsObj = Object.fromEntries(url.searchParams);
    const input = projectListSchema.parse(searchParamsObj);

    const [listResult, statsResult] = await Promise.all([
      listProjects(ctx.organizationId, input, memberUserId),
      input.stats
        ? getProjectStatistics(ctx.organizationId, memberUserId)
        : getProjectStatistics(ctx.organizationId, memberUserId),
    ]);

    return success(
      {
        ...listResult,
        stats: statsResult,
      },
      rid,
    );
  } catch (e) {
    return projectError(e, rid);
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
    const validated = projectInputSchema.parse(body);

    const project = await createProject(ctx.organizationId, ctx.userId, validated);
    return success(project, rid, 201);
  } catch (e) {
    return projectError(e, rid);
  }
}
