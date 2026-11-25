import {
  createTenantContext,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { getFileDownloadUrl } from "@/server/services/deliverables";
import { requestId, success } from "@/server/api/response";
import { deliverableError } from "../../../../route";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      workspaceSlug: string;
      deliverableId: string;
      fileId: string;
    }>;
  },
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug, deliverableId, fileId } = await params;
    const ctx = await createTenantContext(workspaceSlug, rid);
    requireWorkspaceActive(ctx);

    const result = await getFileDownloadUrl(
      ctx.organizationId,
      ctx.userId,
      deliverableId,
      fileId,
      ctx.role,
    );
    return success(result, rid);
  } catch (e) {
    return deliverableError(e, rid);
  }
}
