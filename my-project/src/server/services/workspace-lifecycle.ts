import "server-only";
import { getMongoDb } from "@/server/db/mongo-client";
import { provisionWorkspace } from "@/server/services/workspace-provisioning";

export async function getWorkspaceLifecycle(organizationId: string) {
  try {
    const db = await getMongoDb();
    const doc = await db.collection("workspaceLifecycles").findOne({ organizationId });
    if (!doc) return null;
    return {
      organizationId: String(doc.organizationId),
      status: (doc.status as "active" | "archived") ?? "active",
      archivedAt: (doc.archivedAt as Date | null) ?? null,
      archivedByUserId: (doc.archivedByUserId as string | null) ?? null,
    };
  } catch (error) {
    console.error("[WorkspaceLifecycle] Failed to fetch lifecycle:", error);
    return null;
  }
}

export async function assertWorkspaceActiveForOrganization(organizationId: string) {
  let lifecycle = await getWorkspaceLifecycle(organizationId);
  if (!lifecycle) {
    // Automatically provision lifecycle if missing
    try {
      await provisionWorkspace(organizationId);
      lifecycle = await getWorkspaceLifecycle(organizationId);
    } catch (err) {
      console.error("[WorkspaceLifecycle] Auto-provisioning failed:", err);
    }
  }
  if (!lifecycle) throw new Error("WORKSPACE_NOT_PROVISIONED");
  if (lifecycle.status !== "active") throw new Error("WORKSPACE_ARCHIVED");
  return lifecycle;
}
