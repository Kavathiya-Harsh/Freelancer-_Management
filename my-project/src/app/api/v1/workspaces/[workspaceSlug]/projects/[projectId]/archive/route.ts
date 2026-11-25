import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { archiveProject } from "@/server/services/projects";
import { failure, requestId, success } from "@/server/api/response";

export const runtime = "nodejs";

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

    const archived = await archiveProject(ctx.organizationId, ctx.userId, projectId);
    return success(archived, rid);
  } catch (e) {
    const code = e instanceof Error ? e.message : "ARCHIVE_ERROR";
    return failure(
      code,
      "Unable to archive project.",
      rid,
      code === "UNAUTHENTICATED"
        ? 401
        : code === "PROJECT_NOT_FOUND"
          ? 404
          : code === "WORKSPACE_FORBIDDEN"
            ? 403
            : 400,
    );
  }
}
