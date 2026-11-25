import { headers } from "next/headers";
import { auth } from "@/server/auth/auth";
import { createTenantContext } from "@/server/authorization/tenant-context";
import { failure, requestId, success } from "@/server/api/response";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const id = requestId(request);
  try {
    const context = await createTenantContext((await params).workspaceSlug, id);
    await auth.api.setActiveOrganization({
      body: { organizationId: context.organizationId },
      headers: await headers(),
    });
    return success(
      { organizationId: context.organizationId, workspaceSlug: context.workspaceSlug },
      id,
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "FORBIDDEN";
    return failure(
      code === "UNAUTHENTICATED" ? code : "WORKSPACE_FORBIDDEN",
      "You do not have access to this workspace.",
      id,
      code === "UNAUTHENTICATED" ? 401 : 403,
    );
  }
}
