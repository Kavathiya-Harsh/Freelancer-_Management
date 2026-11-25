import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { requestId, success } from "@/server/api/response";
import { paymentError } from "@/server/api/payment-error";
import { paymentInputSchema, paymentListSchema } from "@/validations/payment";
import {
  getPaymentStatistics,
  listPayments,
  recordPayment,
} from "@/server/services/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const rid = requestId(request);
  try {
    const context = requirePermission(
      await createTenantContext((await params).workspaceSlug, rid),
      ["owner", "admin"],
    );
    const query = new URL(request.url).searchParams;
    const input = paymentListSchema.parse({
      invoiceId: query.get("invoiceId") || undefined,
      clientId: query.get("clientId") || undefined,
      projectId: query.get("projectId") || undefined,
      status: query.get("status") || "all",
      paymentMethod: query.get("paymentMethod") || "all",
      search: query.get("search") || undefined,
      page: query.get("page") || 1,
      limit: query.get("limit") || 20,
      sortOrder: query.get("sortOrder") || "desc",
    });
    const [data, stats] = await Promise.all([
      listPayments(context.organizationId, context.userId, input),
      getPaymentStatistics(context.organizationId),
    ]);
    return success({ ...data, stats }, rid);
  } catch (error) {
    return paymentError(error, rid);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const rid = requestId(request);
  try {
    const context = requirePermission(
      await requireWorkspaceActive(
        await createTenantContext((await params).workspaceSlug, rid),
      ),
      ["owner", "admin"],
    );
    const input = paymentInputSchema.parse(await request.json());
    const payment = await recordPayment(context.organizationId, context.userId, input);
    return success(payment, rid, 201);
  } catch (error) {
    return paymentError(error, rid);
  }
}
