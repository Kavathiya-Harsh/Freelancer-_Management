import { clientInputSchema } from "@/validations/client";
import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { getClient, updateClient } from "@/server/services/clients";
import { failure, requestId, success } from "@/server/api/response";
export const runtime = "nodejs";
const err = (e: unknown, id: string) => {
  const c = e instanceof Error ? e.message : "ERROR";
  return failure(
    c,
    c === "CLIENT_NOT_FOUND" ? "Client not found." : "Unable to process client request.",
    id,
    c === "CLIENT_NOT_FOUND"
      ? 404
      : c === "UNAUTHENTICATED"
        ? 401
        : c === "WORKSPACE_FORBIDDEN"
          ? 403
          : 400,
  );
};
export async function GET(
  r: Request,
  { params }: { params: Promise<{ workspaceSlug: string; clientId: string }> },
) {
  const rid = requestId(r);
  try {
    const p = await params;
    const ctx = await createTenantContext(p.workspaceSlug, rid);
    requirePermission(ctx, ["owner", "admin"]);
    const client = await getClient(ctx.organizationId, p.clientId);
    if (!client) return failure("CLIENT_NOT_FOUND", "Client not found.", rid, 404);
    return success(client, rid);
  } catch (e) {
    return err(e, rid);
  }
}
export async function PATCH(
  r: Request,
  { params }: { params: Promise<{ workspaceSlug: string; clientId: string }> },
) {
  const rid = requestId(r);
  try {
    const p = await params;
    const ctx = await createTenantContext(p.workspaceSlug, rid);
    requirePermission(await requireWorkspaceActive(ctx), ["owner", "admin"]);
    const client = await updateClient(
      ctx.organizationId,
      ctx.userId,
      p.clientId,
      clientInputSchema.parse(await r.json()),
    );
    if (!client) return failure("CLIENT_NOT_FOUND", "Client not found.", rid, 404);
    return success(client, rid);
  } catch (e) {
    return err(e, rid);
  }
}
