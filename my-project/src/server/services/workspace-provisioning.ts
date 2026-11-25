import "server-only";
import { getMongoDb } from "@/server/db/mongo-client";

export async function provisionWorkspace(organizationId: string) {
  try {
    const db = await getMongoDb();
    const now = new Date();
    await Promise.all([
      db.collection("workspaceLifecycles").updateOne(
        { organizationId },
        {
          $setOnInsert: {
            organizationId,
            status: "active",
            archivedAt: null,
            archivedByUserId: null,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true },
      ),
      db.collection("workspacePreferences").updateOne(
        { organizationId },
        {
          $setOnInsert: {
            organizationId,
            currency: "USD",
            timezone: "UTC",
            invoicePrefix: "INV",
            invoiceSequence: 0,
            notificationPreferences: {
              emailActivity: true,
              emailInvoices: true,
            },
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true },
      ),
    ]);
    const lifecycle = await db.collection("workspaceLifecycles").findOne({ organizationId });
    const preferences = await db.collection("workspacePreferences").findOne({ organizationId });
    return { lifecycle, preferences };
  } catch (error) {
    console.error("Workspace provisioning failed", {
      organizationId,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    throw new Error("Workspace provisioning failed.");
  }
}
