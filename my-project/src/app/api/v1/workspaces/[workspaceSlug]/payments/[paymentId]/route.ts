import {
  createTenantContext,
  requirePermission,
} from "@/server/authorization/tenant-context";
import { failure, requestId, success } from "@/server/api/response";
import { getPaymentById } from "@/server/services/payments";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string; paymentId: string }> },
) {
  const rid = requestId(request);
  try {
    const context = requirePermission(
      await createTenantContext((await params).workspaceSlug, rid),
      ["owner", "admin"],
    );
    const { paymentId } = await params;
    return success(await getPaymentById(context.organizationId, paymentId), rid);
  } catch (error) {
    const code = error instanceof Error ? error.message : "PAYMENT_ERROR";
    return failure(
      code,
      code === "PAYMENT_NOT_FOUND" ? "Payment not found." : "Unable to load payment.",
      rid,
      code === "PAYMENT_NOT_FOUND" ? 404 : 400,
    );
  }
}
