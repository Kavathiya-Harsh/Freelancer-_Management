import {
  createTenantContext,
  requirePermission,
} from "@/server/authorization/tenant-context";
import { failure, requestId } from "@/server/api/response";
import { getInvoiceById } from "@/server/services/invoices";
import { generateInvoicePdf } from "@/server/services/invoice-pdf";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string; invoiceId: string }> },
) {
  const rid = requestId(request);
  try {
    const context = requirePermission(
      await createTenantContext((await params).workspaceSlug, rid),
      ["owner", "admin"],
    );
    const { invoiceId } = await params;
    const invoice = await getInvoiceById(context.organizationId, invoiceId);
    if (invoice.status === "draft") {
      return failure(
        "INVOICE_NOT_ISSUED",
        "A PDF is available only after the invoice is issued.",
        rid,
        409,
      );
    }
    const bytes = await generateInvoicePdf(invoice as never);
    const filename = `freelanceflow-${String(invoice.invoiceNumber).replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`;
    return new Response(
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
      {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="${filename}"`,
          "x-request-id": rid,
        },
      },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVOICE_PDF_ERROR";
    return failure(
      code,
      code === "INVOICE_NOT_FOUND"
        ? "Invoice not found."
        : "Unable to generate the invoice PDF.",
      rid,
      code === "INVOICE_NOT_FOUND" ? 404 : 400,
    );
  }
}
