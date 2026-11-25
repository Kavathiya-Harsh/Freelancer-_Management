import { DeliverableManager } from "@/components/deliverables/deliverable-manager";

export default async function DeliverablesPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  return <DeliverableManager workspaceSlug={workspaceSlug} />;
}
