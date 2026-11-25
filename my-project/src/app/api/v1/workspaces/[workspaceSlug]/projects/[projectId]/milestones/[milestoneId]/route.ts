import { milestoneUpdateSchema } from "@/validations/milestone";
import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { getMilestoneById, updateMilestone } from "@/server/services/milestones";
import { failure, requestId, success } from "@/server/api/response";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      workspaceSlug: string;
      projectId: string;
      milestoneId: string;
    }>;
  },
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug, projectId, milestoneId } = await params;
    const ctx = await createTenantContext(workspaceSlug, rid);

    const milestone = await getMilestoneById(ctx.organizationId, projectId, milestoneId);
    return success(milestone, rid);
  } catch (e) {
    const code = e instanceof Error ? e.message : "MILESTONE_ERROR";
    return failure(
      code,
      "Unable to fetch milestone.",
      rid,
      code === "UNAUTHENTICATED" ? 401 : code === "MILESTONE_NOT_FOUND" ? 404 : 400,
    );
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      workspaceSlug: string;
      projectId: string;
      milestoneId: string;
    }>;
  },
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug, projectId, milestoneId } = await params;
    const ctx = await createTenantContext(workspaceSlug, rid);
    requirePermission(await requireWorkspaceActive(ctx), ["owner", "admin"]);

    const body = await request.json();
    const validated = milestoneUpdateSchema.parse(body);

    const updated = await updateMilestone(
      ctx.organizationId,
      ctx.userId,
      projectId,
      milestoneId,
      validated,
    );
    return success(updated, rid);
  } catch (e) {
    const code = e instanceof Error ? e.message : "MILESTONE_ERROR";
    return failure(
      code,
      "Unable to update milestone.",
      rid,
      code === "UNAUTHENTICATED"
        ? 401
        : code === "WORKSPACE_FORBIDDEN"
          ? 403
          : code === "MILESTONE_NOT_FOUND"
            ? 404
            : 400,
    );
  }
}
