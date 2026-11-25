import { ClientManager } from "@/components/clients/client-manager";
export default async function ClientsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  return <ClientManager workspaceSlug={(await params).workspaceSlug} />;
}
