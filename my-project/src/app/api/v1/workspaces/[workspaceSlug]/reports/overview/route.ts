import { createTenantContext } from "@/server/authorization/tenant-context";
import { failure, requestId, success } from "@/server/api/response";
import {
  getDashboardAnalytics,
  getWorkspaceAnalyticsOptions,
} from "@/server/analytics/service";
import { resolveAnalyticsRange } from "@/server/analytics/range";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/v1/workspaces/[workspaceSlug]/reports/overview">,
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
    return success(
      await getDashboardAnalytics(context.organizationId, context.role, range, timezone),
      rid,
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "REPORT_ERROR";
    const status =
      code === "UNAUTHENTICATED"
        ? 401
        : code === "WORKSPACE_FORBIDDEN"
          ? 403
          : code === "WORKSPACE_NOT_FOUND"
            ? 404
            : code === "INVALID_DATE_RANGE"
              ? 400
              : 500;
    const message =
      code === "INVALID_DATE_RANGE"
        ? "Choose a valid date range of up to 366 days."
        : status === 500
          ? "Unable to load dashboard analytics."
          : "Unable to access this workspace report.";
    return failure(
      code === "INVALID_DATE_RANGE" ? code : "REPORT_ERROR",
      message,
      rid,
      status,
    );
  }
}
