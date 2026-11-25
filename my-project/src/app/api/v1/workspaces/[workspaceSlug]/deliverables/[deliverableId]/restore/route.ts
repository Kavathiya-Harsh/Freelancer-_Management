import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { restoreDeliverable } from "@/server/services/deliverables";
import { requestId, success } from "@/server/api/response";
import { deliverableError } from "../../route";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ workspaceSlug: string; deliverableId: string }>;
  },
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug, deliverableId } = await params;
    const ctx = await createTenantContext(workspaceSlug, rid);
    requireWorkspaceActive(ctx);
    requirePermission(ctx, ["owner", "admin"]);

    const updated = await restoreDeliverable(
      ctx.organizationId,
      ctx.userId,
      deliverableId,
      ctx.role,
    );
    return success(updated, rid);
  } catch (e) {
    return deliverableError(e, rid);
  }
}
