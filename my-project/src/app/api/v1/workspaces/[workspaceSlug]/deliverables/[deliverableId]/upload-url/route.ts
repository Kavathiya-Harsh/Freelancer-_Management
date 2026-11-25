import { uploadUrlRequestSchema } from "@/validations/deliverable";
import {
  createTenantContext,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { requestFileUploadUrl } from "@/server/services/deliverables";
import { requestId, success } from "@/server/api/response";
import { deliverableError } from "../../route";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ workspaceSlug: string; deliverableId: string }>;
  },
) {
  const rid = requestId(request);
  try {
    const { workspaceSlug, deliverableId } = await params;
    const ctx = await createTenantContext(workspaceSlug, rid);
    requireWorkspaceActive(ctx);

    const body = await request.json();
    const parsed = uploadUrlRequestSchema.parse(body);

    const result = await requestFileUploadUrl(
      ctx.organizationId,
      ctx.userId,
      deliverableId,
      parsed,
      ctx.role,
    );
    return success(result, rid);
  } catch (e) {
    return deliverableError(e, rid);
  }
}
