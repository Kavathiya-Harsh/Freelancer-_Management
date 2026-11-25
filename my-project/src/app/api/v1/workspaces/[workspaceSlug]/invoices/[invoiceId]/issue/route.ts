import {
  createTenantContext,
  requireWorkspaceActive,
  requirePermission,
} from "@/server/authorization/tenant-context";
import { issueInvoice } from "@/server/services/invoices";
import { requestId, success } from "@/server/api/response";
import { invoiceError } from "@/server/api/invoice-error";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string; invoiceId: string }> },
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug, invoiceId } = await params;
    const ctx = await createTenantContext(workspaceSlug, rid);
    requireWorkspaceActive(ctx);
    requirePermission(ctx, ["owner", "admin"]);

    const issued = await issueInvoice(ctx.organizationId, ctx.userId, invoiceId);
    return success(issued, rid);
  } catch (e) {
    return invoiceError(e, rid);
  }
}
