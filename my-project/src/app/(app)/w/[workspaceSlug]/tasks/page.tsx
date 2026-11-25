import { TaskBoard } from "@/components/tasks/task-board";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  return <TaskBoard workspaceSlug={workspaceSlug} />;
}
