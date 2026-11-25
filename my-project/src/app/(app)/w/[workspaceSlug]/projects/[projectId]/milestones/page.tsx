import { MilestoneManager } from "@/components/milestones/milestone-manager";

export default async function MilestonesPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const { workspaceSlug, projectId } = await params;
  return <MilestoneManager workspaceSlug={workspaceSlug} projectId={projectId} />;
}
