import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { failure, requestId, success } from "@/server/api/response";
import { paymentInputSchema } from "@/validations/payment";
import { recordPayment } from "@/server/services/payments";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string; invoiceId: string }> },
) {
  const rid = requestId(request);
  try {
    const context = requirePermission(
      await requireWorkspaceActive(
        await createTenantContext((await params).workspaceSlug, rid),
      ),
      ["owner", "admin"],
    );
    const { invoiceId } = await params;
    const input = paymentInputSchema.parse({
      ...(await request.json()),
      invoiceId,
    });
    return success(
      await recordPayment(context.organizationId, context.userId, input),
      rid,
      201,
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "PAYMENT_ERROR";
    return failure(
      code,
      code.startsWith("OVERPAYMENT") || code.startsWith("CANNOT")
        ? code
        : "Unable to record the invoice payment.",
      rid,
      code.startsWith("CANNOT") ? 409 : code.startsWith("OVERPAYMENT") ? 422 : 400,
    );
  }
}
