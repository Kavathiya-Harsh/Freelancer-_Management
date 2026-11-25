import { DeliverableDetailView } from "@/components/deliverables/deliverable-detail-view";

export default async function DeliverableDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; deliverableId: string }>;
}) {
  const { workspaceSlug, deliverableId } = await params;
  return (
    <DeliverableDetailView workspaceSlug={workspaceSlug} deliverableId={deliverableId} />
  );
}
