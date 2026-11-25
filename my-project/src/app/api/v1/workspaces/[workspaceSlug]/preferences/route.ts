import { z } from "zod";
import {
  createTenantContext,
  requirePermission,
  requireWorkspaceActive,
} from "@/server/authorization/tenant-context";
import { failure, requestId, success } from "@/server/api/response";
import { getMongooseConnection } from "@/server/db/mongoose";
import { WorkspacePreferencesModel } from "@/server/models/workspace-preferences";

export const runtime = "nodejs";

const preferencesSchema = z.object({
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  invoicePrefix: z
    .string()
    .trim()
    .regex(/^[A-Z0-9_-]{1,12}$/)
    .optional(),
  notificationPreferences: z
    .object({
      emailActivity: z.boolean().optional(),
      emailInvoices: z.boolean().optional(),
    })
    .strict()
    .optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const rid = requestId(request);
  try {
    const context = await createTenantContext((await params).workspaceSlug, rid);
    await getMongooseConnection();
    const preferences = await WorkspacePreferencesModel.findOne({
      organizationId: context.organizationId,
    }).lean();
    return success(
      preferences ?? {
        currency: "USD",
        timezone: "UTC",
        invoicePrefix: "INV",
        notificationPreferences: {
          emailActivity: true,
          emailInvoices: true,
        },
      },
      rid,
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "PREFERENCES_ERROR";
    return failure(code, "Unable to load workspace preferences.", rid, 400);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const rid = requestId(request);
  try {
    const context = requirePermission(
      await requireWorkspaceActive(
        await createTenantContext((await params).workspaceSlug, rid),
      ),
      ["owner", "admin"],
    );
    const input = preferencesSchema.parse(await request.json());
    await getMongooseConnection();
    const preferences = await WorkspacePreferencesModel.findOneAndUpdate(
      { organizationId: context.organizationId },
      { $set: input },
      { new: true, upsert: true },
    ).lean();
    return success(preferences, rid);
  } catch (error) {
    const code = error instanceof Error ? error.message : "PREFERENCES_ERROR";
    return failure(
      error instanceof z.ZodError ? "VALIDATION_ERROR" : code,
      error instanceof z.ZodError
        ? "Invalid workspace preferences."
        : "Unable to update workspace preferences.",
      rid,
      error instanceof z.ZodError ? 422 : 400,
    );
  }
}
