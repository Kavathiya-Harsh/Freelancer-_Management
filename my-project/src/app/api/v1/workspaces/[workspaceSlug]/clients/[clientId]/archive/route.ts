import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { setClientArchive } from "@/server/services/clients";
import { failure, requestId, success } from "@/server/api/response";
export const runtime = "nodejs";
export async function POST(
  r: Request,
  { params }: { params: Promise<{ workspaceSlug: string; clientId: string }> },
) {
  const rid = requestId(r);
  try {
    const p = await params;
    const c = await createTenantContext(p.workspaceSlug, rid);
    requirePermission(await requireWorkspaceActive(c), ["owner", "admin"]);
    const client = await setClientArchive(c.organizationId, c.userId, p.clientId, true);
    return client
      ? success(client, rid)
      : failure("CLIENT_NOT_FOUND", "Client not found.", rid, 404);
  } catch {
    return failure("CLIENT_ARCHIVE_FAILED", "Unable to archive client.", rid, 400);
  }
}
