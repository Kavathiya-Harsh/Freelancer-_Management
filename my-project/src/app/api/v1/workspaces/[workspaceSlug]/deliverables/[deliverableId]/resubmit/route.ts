import { reviewActionSchema } from "@/validations/deliverable";
import {
  createTenantContext,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { submitDeliverable } from "@/server/services/deliverables";
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

    let comment: string | undefined;
    try {
      const body = await request.json();
      const parsed = reviewActionSchema.parse(body);
      comment = parsed.comment;
    } catch {
      comment = undefined;
    }

    const updated = await submitDeliverable(
      ctx.organizationId,
      ctx.userId,
      deliverableId,
      comment,
      ctx.role,
    );
    return success(updated, rid);
  } catch (e) {
    return deliverableError(e, rid);
  }
}
