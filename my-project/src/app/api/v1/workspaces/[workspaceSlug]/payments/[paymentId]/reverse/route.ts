import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { failure, requestId, success } from "@/server/api/response";
import { paymentReversalSchema } from "@/validations/payment";
import { reversePayment } from "@/server/services/payments";

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
    const input = paymentReversalSchema.parse(await request.json());
    return success(
      await reversePayment(
        context.organizationId,
        context.userId,
        paymentId,
        input.reason,
      ),
      rid,
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "PAYMENT_ERROR";
    return failure(
      code,
      code.startsWith("CANNOT_") ? code : "Unable to reverse payment.",
      rid,
      409,
    );
  }
}
