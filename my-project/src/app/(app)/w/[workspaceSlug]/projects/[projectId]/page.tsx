import { ProjectDetailsView } from "@/components/projects/project-details-view";

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const { workspaceSlug, projectId } = await params;
  return <ProjectDetailsView workspaceSlug={workspaceSlug} projectId={projectId} />;
}
