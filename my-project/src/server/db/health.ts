import "server-only";
import { getMongoDb } from "@/server/db/mongo-client";

export async function checkDatabaseHealth(): Promise<{ ok: boolean }> {
  try {
    await (await getMongoDb()).command({ ping: 1 });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
