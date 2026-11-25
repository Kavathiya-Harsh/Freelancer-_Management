import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { requestId, success } from "@/server/api/response";
import { paymentStatusUpdateSchema } from "@/validations/payment";
import { updatePendingPaymentStatus } from "@/server/services/payments";
import { failure } from "@/server/api/response";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string; paymentId: string }> },
) {
  const rid = requestId(request);
  try {
    const context = requirePermission(
      await requireWorkspaceActive(
        await createTenantContext((await params).workspaceSlug, rid),
      ),
      ["owner", "admin"],
    );
    const { paymentId } = await params;
    const input = paymentStatusUpdateSchema.parse(await request.json());
    return success(
      await updatePendingPaymentStatus(
        context.organizationId,
        context.userId,
        paymentId,
        input.status,
      ),
      rid,
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "PAYMENT_ERROR";
    return failure(
      code,
      code.startsWith("CANNOT_") ? code : "Unable to update payment.",
      rid,
      409,
    );
  }
}
