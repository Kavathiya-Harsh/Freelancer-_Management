import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth/auth";
import { getMongoClient } from "@/server/db/mongo-client";
import { getServerEnv } from "@/server/env";

export const runtime = "nodejs";
const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  getServerEnv();
  await getMongoClient();
  return handler.GET(request);
}

export async function POST(request: Request) {
  getServerEnv();
  await getMongoClient();
  return handler.POST(request);
}
