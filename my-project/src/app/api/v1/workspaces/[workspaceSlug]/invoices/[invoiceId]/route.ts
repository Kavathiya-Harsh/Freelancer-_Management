import { invoiceUpdateSchema } from "@/validations/invoice";
import {
  createTenantContext,
  requireWorkspaceActive,
  requirePermission,
} from "@/server/authorization/tenant-context";
import { getInvoiceById, updateDraftInvoice } from "@/server/services/invoices";
import { requestId, success } from "@/server/api/response";
import { invoiceError } from "@/server/api/invoice-error";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string; invoiceId: string }> },
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug, invoiceId } = await params;
    const ctx = await createTenantContext(workspaceSlug, rid);
    requirePermission(ctx, ["owner", "admin"]);
    const invoice = await getInvoiceById(ctx.organizationId, invoiceId);
    return success(invoice, rid);
  } catch (e) {
    return invoiceError(e, rid);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string; invoiceId: string }> },
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug, invoiceId } = await params;
    const ctx = await createTenantContext(workspaceSlug, rid);
    requireWorkspaceActive(ctx);
    requirePermission(ctx, ["owner", "admin"]);

    const body = await request.json();
    const parsed = invoiceUpdateSchema.parse(body);
    const updated = await updateDraftInvoice(
      ctx.organizationId,
      ctx.userId,
      invoiceId,
      parsed,
    );
    return success(updated, rid);
  } catch (e) {
    return invoiceError(e, rid);
  }
}
