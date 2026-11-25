import { deliverableUpdateSchema } from "@/validations/deliverable";
import {
  createTenantContext,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { getDeliverableById, updateDeliverable } from "@/server/services/deliverables";
import { requestId, success } from "@/server/api/response";
import { deliverableError } from "../route";

export const runtime = "nodejs";

export async function GET(
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

    const deliverable = await getDeliverableById(
      ctx.organizationId,
      deliverableId,
      ctx.role,
      ctx.userId,
    );
    return success(deliverable, rid);
  } catch (e) {
    return deliverableError(e, rid);
  }
}

export async function PATCH(
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

    const body = await request.json();
    const parsed = deliverableUpdateSchema.parse(body);

    const updated = await updateDeliverable(
      ctx.organizationId,
      ctx.userId,
      deliverableId,
      parsed,
      ctx.role,
    );
    return success(updated, rid);
  } catch (e) {
    return deliverableError(e, rid);
  }
}
