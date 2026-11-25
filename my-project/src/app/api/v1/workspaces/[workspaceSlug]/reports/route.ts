import { createTenantContext } from "@/server/authorization/tenant-context";
import { failure, requestId, success } from "@/server/api/response";
import {
  getDashboardAnalytics,
  getWorkspaceAnalyticsOptions,
} from "@/server/analytics/service";
import { resolveAnalyticsRange, safeCsvCell } from "@/server/analytics/range";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/v1/workspaces/[workspaceSlug]/reports">,
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug } = await params;
    const context = await createTenantContext(workspaceSlug, rid);
    const query = new URL(request.url).searchParams;
    const { timezone } = await getWorkspaceAnalyticsOptions(context.organizationId);
    const range = resolveAnalyticsRange(
      { preset: query.get("preset"), start: query.get("start"), end: query.get("end") },
      timezone,
    );
    const data = await getDashboardAnalytics(
      context.organizationId,
      context.role,
      range,
      timezone,
    );
    if (query.get("format") !== "csv") return success(data, rid);
    if (!data.canViewFinancials || !("financial" in data) || !data.financial)
      return failure(
        "WORKSPACE_FORBIDDEN",
        "You do not have permission to export financial reports.",
        rid,
        403,
      );
    const report = query.get("report") === "invoices" ? "invoices" : "revenue";
    const lines =
      report === "revenue"
        ? [
            ["Period", "Currency", "Received amount (minor units)"],
            ...data.financial.series.map((row) => [
              row.period,
              row.currency,
              row.amountMinor,
            ]),
          ]
        : [
            [
              "Invoice",
              "Client",
              "Issue date",
              "Due date",
              "Currency",
              "Total (minor units)",
              "Outstanding (minor units)",
              "Status",
            ],
            ...data.financial.invoices.recent.map((row) => [
              row.invoiceNumber,
              row.client,
              row.issueDate,
              row.dueDate,
              row.currency,
              row.totalMinor,
              row.amountDueMinor,
              row.status,
            ]),
          ];
    const csv = lines.map((line) => line.map(safeCsvCell).join(",")).join("\r\n");
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="freelanceflow-${report}-${range.start.toISOString().slice(0, 10)}.csv"`,
        "x-request-id": rid,
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REPORT_ERROR";
    return failure(
      code === "INVALID_DATE_RANGE" ? code : "REPORT_ERROR",
      code === "INVALID_DATE_RANGE"
        ? "Choose a valid date range of up to 366 days."
        : "Unable to generate this report.",
      rid,
      code === "INVALID_DATE_RANGE" ? 400 : 500,
    );
  }
}
