import { DashboardView } from "@/components/dashboard/dashboard-view";
import { requireSession } from "@/server/authorization/tenant-context";

export default async function ReportsPage({
  params,
}: PageProps<"/w/[workspaceSlug]/reports">) {
  const [{ workspaceSlug }, session] = await Promise.all([params, requireSession()]);
  return (
    <DashboardView workspaceSlug={workspaceSlug} userName={session.user.name} reports />
  );
}
