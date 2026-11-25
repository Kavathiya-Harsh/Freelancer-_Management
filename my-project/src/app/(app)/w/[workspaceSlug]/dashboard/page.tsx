import { DashboardView } from "@/components/dashboard/dashboard-view";
import { requireSession } from "@/server/authorization/tenant-context";

export default async function DashboardPage({
  params,
}: PageProps<"/w/[workspaceSlug]/dashboard">) {
  const [{ workspaceSlug }, session] = await Promise.all([params, requireSession()]);
  return <DashboardView workspaceSlug={workspaceSlug} userName={session.user.name} />;
}
