import { z } from "zod";
import {
  createTenantContext,
  requireWorkspaceActive,
  requirePermission,
} from "@/server/authorization/tenant-context";
import { voidInvoice } from "@/server/services/invoices";
import { requestId, success } from "@/server/api/response";
import { invoiceError } from "@/server/api/invoice-error";

export const runtime = "nodejs";

const voidBodySchema = z.object({
  reason: z.string().trim().max(500).optional().default(""),
});

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

    const body = await request.json().catch(() => ({}));
    const { reason } = voidBodySchema.parse(body);
    const voided = await voidInvoice(ctx.organizationId, ctx.userId, invoiceId, reason);
    return success(voided, rid);
  } catch (e) {
    return invoiceError(e, rid);
  }
}
