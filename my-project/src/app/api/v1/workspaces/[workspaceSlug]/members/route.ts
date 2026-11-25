import {
  createTenantContext,
  requirePermission,
} from "@/server/authorization/tenant-context";
import { getMongoDb } from "@/server/db/mongo-client";
import { failure, requestId, success } from "@/server/api/response";
import { Types } from "mongoose";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const id = requestId(request);
  try {
    const context = requirePermission(
      await createTenantContext((await params).workspaceSlug, id),
      ["owner", "admin", "member"],
    );
    const db = await getMongoDb();
    const members = await db
      .collection("member")
      .find({ organizationId: context.organizationId })
      .project({ id: 1, userId: 1, role: 1, createdAt: 1 })
      .toArray();

    const userIds = members.map((m) => m.userId);
    const validUserOids = userIds
      .filter((uid) => typeof uid === "string" && Types.ObjectId.isValid(uid))
      .map((uid) => new Types.ObjectId(uid));

    const users = await db
      .collection("user")
      .find(
        validUserOids.length > 0
          ? {
              $or: [{ id: { $in: userIds } }, { _id: { $in: validUserOids } }],
            }
          : { id: { $in: userIds } },
      )
      .project({ id: 1, _id: 1, name: 1, email: 1, image: 1 })
      .toArray();

    const userMap = new Map<string, { name?: string; email?: string; image?: string }>();
    for (const u of users) {
      if (u.id) userMap.set(String(u.id), u);
      if (u._id) userMap.set(String(u._id), u);
    }

    const enriched = members.map((m) => {
      const u = userMap.get(String(m.userId));
      return {
        ...m,
        name: u?.name || u?.email || m.userId,
        email: u?.email || "",
        image: u?.image || null,
      };
    });

    return success(enriched, id);
  } catch (error) {
    const code = error instanceof Error ? error.message : "FORBIDDEN";
    return failure(
      code === "UNAUTHENTICATED" ? code : "FORBIDDEN",
      "You do not have permission to view workspace members.",
      id,
      code === "UNAUTHENTICATED" ? 401 : 403,
    );
  }
}
