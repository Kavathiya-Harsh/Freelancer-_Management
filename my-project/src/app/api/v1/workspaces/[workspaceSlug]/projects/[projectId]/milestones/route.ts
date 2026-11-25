import { milestoneInputSchema, milestoneListSchema } from "@/validations/milestone";
import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { createMilestone, listMilestones } from "@/server/services/milestones";
import { failure, requestId, success } from "@/server/api/response";

export const runtime = "nodejs";

const milestoneError = (e: unknown, rid: string) => {
  const code = e instanceof Error ? e.message : "MILESTONE_ERROR";
  let status = 400;
  let message = "Unable to process milestone request.";

  switch (code) {
    case "UNAUTHENTICATED":
      status = 401;
      message = "You must be signed in to perform this action.";
      break;
    case "WORKSPACE_ARCHIVED":
    case "PROJECT_ARCHIVED":
      status = 409;
      message = "Cannot create or modify milestones in an archived project.";
      break;
    case "WORKSPACE_FORBIDDEN":
      status = 403;
      message = "You do not have permission for this milestone operation.";
      break;
    case "MILESTONE_NOT_FOUND":
      status = 404;
      message = "Milestone not found.";
      break;
    case "PROJECT_NOT_FOUND":
      status = 404;
      message = "Project not found in this workspace.";
      break;
    default:
      if (e instanceof Error && e.name === "ZodError") {
        status = 400;
        message = "Invalid milestone data provided.";
      }
  }

  return failure(code, message, rid, status);
};

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ workspaceSlug: string; projectId: string }>;
  },
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug, projectId } = await params;
    const ctx = await createTenantContext(workspaceSlug, rid);

    const url = new URL(request.url);
    const input = milestoneListSchema.parse(Object.fromEntries(url.searchParams));

    const result = await listMilestones(ctx.organizationId, projectId, input);
    return success(result, rid);
  } catch (e) {
    return milestoneError(e, rid);
  }
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ workspaceSlug: string; projectId: string }>;
  },
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug, projectId } = await params;
    const ctx = await createTenantContext(workspaceSlug, rid);
    requirePermission(await requireWorkspaceActive(ctx), ["owner", "admin"]);

    const body = await request.json();
    const validated = milestoneInputSchema.parse(body);

    const milestone = await createMilestone(
      ctx.organizationId,
      ctx.userId,
      projectId,
      validated,
    );
    return success(milestone, rid, 201);
  } catch (e) {
    return milestoneError(e, rid);
  }
}
