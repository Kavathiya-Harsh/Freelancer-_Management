import { ProjectManager } from "@/components/projects/project-manager";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  return <ProjectManager workspaceSlug={workspaceSlug} />;
}
