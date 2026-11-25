import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { reopenMilestone } from "@/server/services/milestones";
import { failure, requestId, success } from "@/server/api/response";

export const runtime = "nodejs";

export async function POST(
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

    const milestone = await reopenMilestone(
      ctx.organizationId,
      ctx.userId,
      projectId,
      milestoneId,
    );
    return success(milestone, rid);
  } catch (e) {
    const code = e instanceof Error ? e.message : "MILESTONE_ERROR";
    return failure(
      code,
      "Unable to reopen milestone.",
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
