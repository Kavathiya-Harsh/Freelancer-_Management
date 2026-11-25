import { invoiceInputSchema, invoiceListSchema } from "@/validations/invoice";
import {
  createTenantContext,
  requireWorkspaceActive,
  requirePermission,
} from "@/server/authorization/tenant-context";
import {
  createInvoice,
  listInvoices,
  getInvoiceStatistics,
} from "@/server/services/invoices";
import { requestId, success } from "@/server/api/response";
import { invoiceError } from "@/server/api/invoice-error";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug } = await params;
    const ctx = await createTenantContext(workspaceSlug, rid);
    requirePermission(ctx, ["owner", "admin"]);

    const { searchParams } = new URL(request.url);
    const parsedArgs = invoiceListSchema.parse({
      status: searchParams.get("status") || "all",
      clientId: searchParams.get("clientId") || undefined,
      projectId: searchParams.get("projectId") || undefined,
      search: searchParams.get("search") || undefined,
      view: searchParams.get("view") || "active",
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    });

    const [data, stats] = await Promise.all([
      listInvoices(ctx.organizationId, parsedArgs),
      getInvoiceStatistics(ctx.organizationId),
    ]);

    return success({ ...data, stats }, rid);
  } catch (e) {
    return invoiceError(e, rid);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug } = await params;
    const ctx = await createTenantContext(workspaceSlug, rid);
    requireWorkspaceActive(ctx);
    requirePermission(ctx, ["owner", "admin"]);

    const body = await request.json();
    const parsed = invoiceInputSchema.parse(body);

    const created = await createInvoice(ctx.organizationId, ctx.userId, parsed);
    return success(created, rid, 201);
  } catch (e) {
    return invoiceError(e, rid);
  }
}
