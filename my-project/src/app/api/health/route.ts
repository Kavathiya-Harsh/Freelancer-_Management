import { NextResponse } from "next/server";
import { getMongoDb } from "@/server/db/mongo-client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getMongoDb();
    await db.admin().ping();
    return NextResponse.json({ status: "ready" });
  } catch {
    return NextResponse.json(
      { status: "degraded", reason: "database unavailable" },
      { status: 503 },
    );
  }
}
