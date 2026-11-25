import "server-only";
import { Types } from "mongoose";
import { ProjectModel, type ProjectDocument } from "@/server/models/Project";
import { ClientModel, type Client } from "@/server/models/Client";
import { ActivityModel } from "@/server/models/Activity";
import { getMongooseConnection } from "@/server/db/mongoose";
import { getMongoDb } from "@/server/db/mongo-client";
import type {
  ProjectInput,
  ProjectListArgs,
  ProjectUpdateInput,
} from "@/validations/project";

type LeanProject = ProjectDocument & { _id: Types.ObjectId };
type LeanClient = Client & { _id: Types.ObjectId };

const oid = (v: string) => {
  if (!Types.ObjectId.isValid(v)) throw new Error("PROJECT_NOT_FOUND");
  return new Types.ObjectId(v);
};

const normal = (s: string) => s.trim().toLowerCase();

/**
 * Generate a unique project code within the organization
 */
async function generateUniqueProjectCode(org: string, name: string): Promise<string> {
  const letters = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 3);
  const prefix = letters.length >= 2 ? letters : "PRJ";

  for (let i = 0; i < 15; i++) {
    const num = Math.floor(100 + Math.random() * 900);
    const candidate = `${prefix}-${num}`;
    const exists = await ProjectModel.findOne({
      organizationId: org,
      projectCode: candidate,
    })
      .select("_id")
      .lean();
    if (!exists) {
      return candidate;
    }
  }

  // Fallback with timestamp slice
  return `${prefix}-${Date.now().toString().slice(-4)}`;
}

export async function createProject(org: string, user: string, input: ProjectInput) {
  await getMongooseConnection();

  // 1. Validate Client
  const client = (await ClientModel.findOne({
    _id: oid(input.clientId),
    organizationId: org,
  }).lean()) as LeanClient | null;

  if (!client) {
    throw new Error("CLIENT_NOT_FOUND");
  }
  if (client.status === "archived") {
    throw new Error("CLIENT_ARCHIVED");
  }

  // 2. Validate workspace members if assigned
  if (input.memberUserIds && input.memberUserIds.length > 0) {
    const db = await getMongoDb();
    const count = await db.collection("member").countDocuments({
      organizationId: org,
      userId: { $in: input.memberUserIds },
    });
    if (count !== input.memberUserIds.length) {
      throw new Error("INVALID_MEMBER");
    }
  }

  // 3. Resolve Project Code
  let projectCode = input.projectCode?.trim().toUpperCase();
  if (!projectCode) {
    projectCode = await generateUniqueProjectCode(org, input.name);
  } else {
    const exists = await ProjectModel.findOne({
      organizationId: org,
      projectCode,
    })
      .select("_id")
      .lean();
    if (exists) {
      throw new Error("PROJECT_CODE_EXISTS");
    }
  }

  const project = await ProjectModel.create({
    ...input,
    projectCode,
    clientId: oid(input.clientId),
    organizationId: org,
    budgetMinor: Math.max(0, input.budgetMinor ?? 0),
    currency: input.currency?.toUpperCase() || "USD",
    minorUnit: input.minorUnit ?? 2,
    progressPercent: Math.min(100, Math.max(0, input.progressPercent ?? 0)),
    createdByUserId: user,
    updatedByUserId: user,
    normalizedName: normal(input.name),
  });

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "project",
    entityId: project._id,
    action: "created",
    metadata: {
      name: project.name,
      projectCode: project.projectCode,
    },
  });

  return project.toObject();
}

export async function listProjects(
  org: string,
  args: ProjectListArgs,
  memberUserId?: string,
) {
  await getMongooseConnection();

  const query: Record<string, unknown> = { organizationId: org };

  // Role filtering: members only see assigned projects
  if (memberUserId) {
    query.memberUserIds = memberUserId;
  }

  // View / archived filter
  if (args.view === "archived") {
    query.archivedAt = { $ne: null };
  } else if (args.view === "all") {
    // include both active and archived
  } else {
    query.archivedAt = null;
  }

  // Status filter
  if (args.status && args.status !== "all") {
    if (args.status === "archived") {
      query.archivedAt = { $ne: null };
    } else {
      query.status = args.status;
    }
  }

  // Priority filter
  if (args.priority && args.priority !== "all") {
    query.priority = args.priority;
  }

  // Client filter
  if (args.clientId) {
    query.clientId = oid(args.clientId);
  }

  // Search filter
  if (args.search) {
    const s = normal(args.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { normalizedName: { $regex: s } },
      { projectCode: { $regex: s.toUpperCase() } },
      { tags: { $in: [new RegExp(s, "i")] } },
    ];
  }

  // Sorting
  const sort: Record<string, 1 | -1> =
    args.sort === "name"
      ? { normalizedName: 1, _id: 1 }
      : args.sort === "deadline"
        ? { dueDate: 1, _id: 1 }
        : args.sort === "updated"
          ? { updatedAt: -1, _id: -1 }
          : { createdAt: -1, _id: -1 };

  const page = Math.max(1, args.page || 1);
  const limit = Math.min(100, Math.max(1, args.limit || 20));
  const skip = (page - 1) * limit;

  const [rawItems, total] = await Promise.all([
    ProjectModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
    ProjectModel.countDocuments(query),
  ]);

  const items = rawItems as unknown as LeanProject[];

  // Populate Clients
  const clientIds = [
    ...new Set(items.map((p) => p.clientId?.toString()).filter(Boolean)),
  ];
  const rawClients =
    clientIds.length > 0
      ? await ClientModel.find({ _id: { $in: clientIds.map((id) => oid(id)) } })
          .select("name companyName email status")
          .lean()
      : [];

  const clients = rawClients as unknown as LeanClient[];
  const clientMap = new Map<string, LeanClient>();
  for (const c of clients) {
    clientMap.set(c._id.toString(), c);
  }

  // Populate Members
  const allMemberUserIds = [
    ...new Set(items.flatMap((p) => p.memberUserIds || []).filter(Boolean)),
  ];
  const db = await getMongoDb();
  const validObjectIds = allMemberUserIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  const users =
    allMemberUserIds.length > 0
      ? await db
          .collection("user")
          .find(
            validObjectIds.length > 0
              ? {
                  $or: [
                    { id: { $in: allMemberUserIds } },
                    { _id: { $in: validObjectIds } },
                  ],
                }
              : { id: { $in: allMemberUserIds } },
          )
          .project({ id: 1, _id: 1, name: 1, email: 1, image: 1 })
          .toArray()
      : [];

  const userMap = new Map<
    string,
    { name?: string; email?: string; image?: string; userId: string }
  >();
  for (const u of users) {
    const idKey = String(u.id ?? u._id);
    userMap.set(idKey, {
      userId: idKey,
      name: u.name || u.email || idKey,
      email: u.email || "",
      image: u.image || null,
    });
  }

  const enrichedItems = items.map((p) => {
    const client = p.clientId ? clientMap.get(p.clientId.toString()) : undefined;
    const members = (p.memberUserIds || [])
      .map((uid: string) => userMap.get(uid))
      .filter(Boolean);
    return {
      ...p,
      client: client
        ? {
            _id: client._id.toString(),
            name: client.name,
            companyName: client.companyName,
            status: client.status,
          }
        : null,
      members,
    };
  });

  return {
    items: enrichedItems,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getProjectById(
  org: string,
  projectId: string,
  memberUserId?: string,
) {
  await getMongooseConnection();

  const rawProject = await ProjectModel.findOne({
    _id: oid(projectId),
    organizationId: org,
  }).lean();

  if (!rawProject) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const project = rawProject as unknown as LeanProject;

  if (memberUserId && !project.memberUserIds?.includes(memberUserId)) {
    throw new Error("PROJECT_FORBIDDEN");
  }

  // Populate Client
  const rawClient = await ClientModel.findOne({
    _id: project.clientId,
    organizationId: org,
  })
    .select("name companyName email phone status")
    .lean();

  const client = rawClient as unknown as LeanClient | null;

  // Populate Members
  const memberUserIds = project.memberUserIds || [];
  const db = await getMongoDb();
  const validMemberObjectIds = memberUserIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  const users =
    memberUserIds.length > 0
      ? await db
          .collection("user")
          .find(
            validMemberObjectIds.length > 0
              ? {
                  $or: [
                    { id: { $in: memberUserIds } },
                    { _id: { $in: validMemberObjectIds } },
                  ],
                }
              : { id: { $in: memberUserIds } },
          )
          .project({ id: 1, _id: 1, name: 1, email: 1, image: 1 })
          .toArray()
      : [];

  const members = memberUserIds.map((uid: string) => {
    const u = users.find((usr) => String(usr.id ?? usr._id) === uid);
    return {
      userId: uid,
      name: u?.name || u?.email || uid,
      email: u?.email || "",
      image: u?.image || null,
    };
  });

  // Recent activity for this project
  const activities = await ActivityModel.find({
    organizationId: org,
    entityType: "project",
    entityId: project._id,
  })
    .sort({ occurredAt: -1 })
    .limit(10)
    .lean();

  return {
    ...project,
    client: client
      ? {
          _id: client._id.toString(),
          name: client.name,
          companyName: client.companyName,
          email: client.email,
          phone: client.phone,
          status: client.status,
        }
      : null,
    members,
    activities,
  };
}

export async function updateProject(
  org: string,
  user: string,
  projectId: string,
  input: ProjectUpdateInput,
) {
  await getMongooseConnection();

  const rawExisting = await ProjectModel.findOne({
    _id: oid(projectId),
    organizationId: org,
  }).lean();

  if (!rawExisting) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const existing = rawExisting as unknown as LeanProject;

  // Validate Client if changing
  if (input.clientId && input.clientId !== existing.clientId.toString()) {
    const client = (await ClientModel.findOne({
      _id: oid(input.clientId),
      organizationId: org,
    }).lean()) as LeanClient | null;
    if (!client) throw new Error("CLIENT_NOT_FOUND");
    if (client.status === "archived") throw new Error("CLIENT_ARCHIVED");
  }

  // Validate Project Code uniqueness if changing
  if (input.projectCode && input.projectCode !== existing.projectCode) {
    const code = input.projectCode.trim().toUpperCase();
    const duplicate = await ProjectModel.findOne({
      organizationId: org,
      projectCode: code,
      _id: { $ne: existing._id },
    })
      .select("_id")
      .lean();
    if (duplicate) throw new Error("PROJECT_CODE_EXISTS");
  }

  // Validate members if changing
  if (input.memberUserIds && input.memberUserIds.length > 0) {
    const db = await getMongoDb();
    const count = await db.collection("member").countDocuments({
      organizationId: org,
      userId: { $in: input.memberUserIds },
    });
    if (count !== input.memberUserIds.length) {
      throw new Error("INVALID_MEMBER");
    }
  }

  // Validate date logic
  const startDate = input.startDate !== undefined ? input.startDate : existing.startDate;
  const dueDate = input.dueDate !== undefined ? input.dueDate : existing.dueDate;
  if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const updateData: Record<string, unknown> = {
    ...input,
    updatedByUserId: user,
  };

  if (input.name) {
    updateData.normalizedName = normal(input.name);
  }
  if (input.clientId) {
    updateData.clientId = oid(input.clientId);
  }
  if (input.projectCode) {
    updateData.projectCode = input.projectCode.trim().toUpperCase();
  }
  if (input.progressPercent !== undefined) {
    updateData.progressPercent = Math.min(100, Math.max(0, input.progressPercent));
  }
  if (input.budgetMinor !== undefined) {
    updateData.budgetMinor = Math.max(0, input.budgetMinor);
  }

  const rawUpdated = await ProjectModel.findOneAndUpdate(
    { _id: existing._id, organizationId: org },
    { $set: updateData },
    { new: true, runValidators: true },
  ).lean();

  const updated = rawUpdated as unknown as LeanProject | null;

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "project",
    entityId: existing._id,
    action: "updated",
    metadata: {
      name: updated?.name,
      status: updated?.status,
      priority: updated?.priority,
    },
  });

  return updated;
}

export async function archiveProject(org: string, user: string, projectId: string) {
  await getMongooseConnection();

  const rawProject = await ProjectModel.findOneAndUpdate(
    { _id: oid(projectId), organizationId: org },
    {
      $set: {
        archivedAt: new Date(),
        archivedByUserId: user,
        updatedByUserId: user,
      },
    },
    { new: true },
  ).lean();

  if (!rawProject) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const project = rawProject as unknown as LeanProject;

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "project",
    entityId: project._id,
    action: "archived",
  });

  return project;
}

export async function restoreProject(org: string, user: string, projectId: string) {
  await getMongooseConnection();

  const rawProject = await ProjectModel.findOneAndUpdate(
    { _id: oid(projectId), organizationId: org },
    {
      $set: {
        archivedAt: null,
        archivedByUserId: null,
        updatedByUserId: user,
      },
    },
    { new: true },
  ).lean();

  if (!rawProject) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const project = rawProject as unknown as LeanProject;

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "project",
    entityId: project._id,
    action: "restored",
  });

  return project;
}

export async function getProjectStatistics(org: string, memberUserId?: string) {
  await getMongooseConnection();

  const baseQuery: Record<string, unknown> = { organizationId: org };
  if (memberUserId) {
    baseQuery.memberUserIds = memberUserId;
  }

  const [total, inProgress, completed, onHold, planning, archived] = await Promise.all([
    ProjectModel.countDocuments({ ...baseQuery, archivedAt: null }),
    ProjectModel.countDocuments({
      ...baseQuery,
      status: "in_progress",
      archivedAt: null,
    }),
    ProjectModel.countDocuments({
      ...baseQuery,
      status: "completed",
      archivedAt: null,
    }),
    ProjectModel.countDocuments({
      ...baseQuery,
      status: "on_hold",
      archivedAt: null,
    }),
    ProjectModel.countDocuments({
      ...baseQuery,
      status: "planning",
      archivedAt: null,
    }),
    ProjectModel.countDocuments({ ...baseQuery, archivedAt: { $ne: null } }),
  ]);

  return {
    total,
    inProgress,
    completed,
    onHold,
    planning,
    archived,
  };
}
