import "server-only";
import { Types } from "mongoose";
import { getMongooseConnection } from "@/server/db/mongoose";
import { ClientModel } from "@/server/models/Client";
import { ActivityModel } from "@/server/models/Activity";
import type { ClientInput } from "@/validations/client";
const norm = (s?: string) => s?.trim().toLowerCase() || undefined;
const id = (value: string) => {
  if (!Types.ObjectId.isValid(value)) throw new Error("CLIENT_NOT_FOUND");
  return new Types.ObjectId(value);
};
export async function createClient(org: string, user: string, input: ClientInput) {
  const connection = await getMongooseConnection();
  const session = await connection.startSession();
  try {
    let client;
    await session.withTransaction(async () => {
      [client] = await ClientModel.create(
        [
          {
            ...input,
            organizationId: org,
            createdByUserId: user,
            updatedByUserId: user,
            normalizedName: norm(input.name),
            normalizedEmail: norm(input.email),
            normalizedCompanyName: norm(input.companyName),
          },
        ],
        { session },
      );
      await ActivityModel.create(
        [
          {
            organizationId: org,
            actorUserId: user,
            entityType: "client",
            entityId: client!._id,
            action: "created",
          },
        ],
        { session },
      );
    });
    return client!;
  } finally {
    await session.endSession();
  }
}
export async function getClient(org: string, clientId: string) {
  await getMongooseConnection();
  return ClientModel.findOne({ _id: id(clientId), organizationId: org }).lean();
}
export async function updateClient(
  org: string,
  user: string,
  clientId: string,
  input: ClientInput,
) {
  const objectId = id(clientId);
  await getMongooseConnection();
  const client = await ClientModel.findOneAndUpdate(
    { _id: objectId, organizationId: org },
    {
      $set: {
        ...input,
        updatedByUserId: user,
        normalizedName: norm(input.name),
        normalizedEmail: norm(input.email),
        normalizedCompanyName: norm(input.companyName),
      },
    },
    { new: true, runValidators: true },
  ).lean();
  if (client)
    await ActivityModel.create({
      organizationId: org,
      actorUserId: user,
      entityType: "client",
      entityId: objectId,
      action: "updated",
    });
  return client;
}
export async function setClientArchive(
  org: string,
  user: string,
  clientId: string,
  archived: boolean,
) {
  const objectId = id(clientId);
  await getMongooseConnection();
  const client = await ClientModel.findOneAndUpdate(
    { _id: objectId, organizationId: org },
    {
      $set: archived
        ? {
            status: "archived",
            archivedAt: new Date(),
            archivedByUserId: user,
            updatedByUserId: user,
          }
        : {
            status: "active",
            archivedAt: null,
            archivedByUserId: null,
            updatedByUserId: user,
          },
    },
    { new: true },
  ).lean();
  if (client)
    await ActivityModel.create({
      organizationId: org,
      actorUserId: user,
      entityType: "client",
      entityId: objectId,
      action: archived ? "archived" : "restored",
    });
  return client;
}
export async function listClients(
  org: string,
  args: { search?: string; status: string; sort: string; limit: number },
) {
  await getMongooseConnection();
  const query: {
    organizationId: string;
    status?: string;
    $or?: Array<Record<string, unknown>>;
  } = { organizationId: org };
  if (args.status !== "all") query.status = args.status;
  if (args.search) {
    const s = norm(args.search)!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { normalizedName: { $regex: s } },
      { normalizedEmail: { $regex: s } },
      { normalizedCompanyName: { $regex: s } },
    ];
  }
  const sort: Record<string, 1 | -1> =
    args.sort === "name"
      ? { normalizedName: 1, _id: 1 }
      : args.sort === "updated"
        ? { updatedAt: -1, _id: -1 }
        : { createdAt: -1, _id: -1 };
  const [items, total, active, archived] = await Promise.all([
    ClientModel.find(query)
      .select("name companyName email phone status createdAt updatedAt")
      .sort(sort)
      .limit(args.limit)
      .lean(),
    ClientModel.countDocuments(query),
    ClientModel.countDocuments({ organizationId: org, status: "active" }),
    ClientModel.countDocuments({ organizationId: org, status: "archived" }),
  ]);
  return { items, total, stats: { total: active + archived, active, archived } };
}
