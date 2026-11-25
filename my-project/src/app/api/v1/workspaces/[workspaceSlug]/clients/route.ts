import { clientInputSchema, clientListSchema } from "@/validations/client";
import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { createClient, listClients } from "@/server/services/clients";
import { failure, requestId, success } from "@/server/api/response";
export const runtime = "nodejs";
const error = (e: unknown, id: string) => {
  const c = e instanceof Error ? e.message : "ERROR";
  return failure(
    c,
    "Unable to process client request.",
    id,
    c === "UNAUTHENTICATED"
      ? 401
      : c === "WORKSPACE_ARCHIVED"
        ? 409
        : c === "WORKSPACE_FORBIDDEN"
          ? 403
          : 400,
  );
};
export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const rid = requestId(request);
  try {
    const ctx = await createTenantContext((await params).workspaceSlug, rid);
    requirePermission(ctx, ["owner", "admin"]);
    const input = clientListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return success(await listClients(ctx.organizationId, input), rid);
  } catch (e) {
    return error(e, rid);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const rid = requestId(request);
  try {
    const ctx = await createTenantContext((await params).workspaceSlug, rid);
    requirePermission(await requireWorkspaceActive(ctx), ["owner", "admin"]);
    const client = await createClient(
      ctx.organizationId,
      ctx.userId,
      clientInputSchema.parse(await request.json()),
    );
    return success(client, rid, 201);
  } catch (e) {
    return error(e, rid);
  }
}
