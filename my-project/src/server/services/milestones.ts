import "server-only";
import { Types } from "mongoose";
import { MilestoneModel, type MilestoneDocument } from "@/server/models/Milestone";
import { ProjectModel, type ProjectDocument } from "@/server/models/Project";
import { ActivityModel } from "@/server/models/Activity";
import { getMongooseConnection } from "@/server/db/mongoose";
import type {
  MilestoneInput,
  MilestoneListArgs,
  MilestoneUpdateInput,
} from "@/validations/milestone";

type LeanMilestone = MilestoneDocument & { _id: Types.ObjectId };
type LeanProject = ProjectDocument & { _id: Types.ObjectId };

const oid = (v: string) => {
  if (!Types.ObjectId.isValid(v)) throw new Error("MILESTONE_NOT_FOUND");
  return new Types.ObjectId(v);
};

const projectOid = (v: string) => {
  if (!Types.ObjectId.isValid(v)) throw new Error("PROJECT_NOT_FOUND");
  return new Types.ObjectId(v);
};

export async function createMilestone(
  org: string,
  user: string,
  projectId: string,
  input: MilestoneInput,
) {
  await getMongooseConnection();

  // Validate Project
  const project = (await ProjectModel.findOne({
    _id: projectOid(projectId),
    organizationId: org,
  }).lean()) as LeanProject | null;

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }
  if (project.archivedAt) {
    throw new Error("PROJECT_ARCHIVED");
  }

  const isCompleted = input.status === "completed";
  const completedAt = isCompleted ? new Date() : null;
  const completedByUserId = isCompleted ? user : null;

  const milestone = await MilestoneModel.create({
    ...input,
    organizationId: org,
    projectId: project._id,
    completedAt,
    completedByUserId,
    createdByUserId: user,
    updatedByUserId: user,
  });

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "milestone",
    entityId: milestone._id,
    action: "created",
    metadata: {
      title: milestone.title,
      projectId: project._id.toString(),
      projectName: project.name,
    },
  });

  return milestone.toObject();
}

export async function listMilestones(
  org: string,
  projectId: string,
  args?: MilestoneListArgs,
) {
  await getMongooseConnection();
  const pId = projectOid(projectId);

  const query: Record<string, unknown> = {
    organizationId: org,
    projectId: pId,
  };

  if (args?.view === "archived") {
    query.archivedAt = { $ne: null };
  } else if (args?.view === "all") {
    // include all
  } else {
    query.archivedAt = null;
  }

  const rawMilestones = await MilestoneModel.find(query)
    .sort({ order: 1, dueDate: 1 })
    .lean();

  const items = rawMilestones as unknown as LeanMilestone[];
  const now = new Date();

  let upcomingCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let overdueCount = 0;

  const enrichedItems = items.map((m) => {
    let computedStatus: "upcoming" | "in_progress" | "completed" | "overdue" = m.status;

    if (m.status === "completed") {
      completedCount++;
    } else {
      if (m.dueDate && new Date(m.dueDate) < now) {
        computedStatus = "overdue";
        overdueCount++;
      } else if (m.status === "in_progress") {
        inProgressCount++;
      } else {
        upcomingCount++;
      }
    }

    return {
      ...m,
      computedStatus,
      isOverdue: computedStatus === "overdue",
    };
  });

  // Filter by computed status if requested
  const filteredItems =
    args?.status && args.status !== "all"
      ? enrichedItems.filter((m) => m.computedStatus === args.status)
      : enrichedItems;

  const total = items.length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return {
    items: filteredItems,
    stats: {
      total,
      completed: completedCount,
      upcoming: upcomingCount,
      inProgress: inProgressCount,
      overdue: overdueCount,
      percentage,
    },
  };
}

export async function getMilestoneById(
  org: string,
  projectId: string,
  milestoneId: string,
) {
  await getMongooseConnection();

  const raw = await MilestoneModel.findOne({
    _id: oid(milestoneId),
    projectId: projectOid(projectId),
    organizationId: org,
  }).lean();

  if (!raw) {
    throw new Error("MILESTONE_NOT_FOUND");
  }

  const m = raw as unknown as LeanMilestone;
  const now = new Date();
  const isOverdue =
    m.status !== "completed" && m.dueDate ? new Date(m.dueDate) < now : false;

  return {
    ...m,
    isOverdue,
    computedStatus: isOverdue ? "overdue" : m.status,
  };
}

export async function updateMilestone(
  org: string,
  user: string,
  projectId: string,
  milestoneId: string,
  input: MilestoneUpdateInput,
) {
  await getMongooseConnection();

  const rawExisting = await MilestoneModel.findOne({
    _id: oid(milestoneId),
    projectId: projectOid(projectId),
    organizationId: org,
  }).lean();

  if (!rawExisting) {
    throw new Error("MILESTONE_NOT_FOUND");
  }

  const existing = rawExisting as unknown as LeanMilestone;

  const updateData: Record<string, unknown> = {
    ...input,
    updatedByUserId: user,
  };

  if (input.status === "completed" && existing.status !== "completed") {
    updateData.completedAt = new Date();
    updateData.completedByUserId = user;
  } else if (
    input.status &&
    input.status !== "completed" &&
    existing.status === "completed"
  ) {
    updateData.completedAt = null;
    updateData.completedByUserId = null;
  }

  const rawUpdated = await MilestoneModel.findOneAndUpdate(
    { _id: existing._id, organizationId: org },
    { $set: updateData },
    { new: true, runValidators: true },
  ).lean();

  const updated = rawUpdated as unknown as LeanMilestone | null;

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "milestone",
    entityId: existing._id,
    action: "updated",
    metadata: {
      title: updated?.title,
      status: updated?.status,
    },
  });

  return updated;
}

export async function completeMilestone(
  org: string,
  user: string,
  projectId: string,
  milestoneId: string,
) {
  await getMongooseConnection();

  const rawUpdated = await MilestoneModel.findOneAndUpdate(
    {
      _id: oid(milestoneId),
      projectId: projectOid(projectId),
      organizationId: org,
    },
    {
      $set: {
        status: "completed",
        completedAt: new Date(),
        completedByUserId: user,
        updatedByUserId: user,
      },
    },
    { new: true },
  ).lean();

  if (!rawUpdated) {
    throw new Error("MILESTONE_NOT_FOUND");
  }

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "milestone",
    entityId: rawUpdated._id,
    action: "completed",
    metadata: { title: rawUpdated.title },
  });

  return rawUpdated;
}

export async function reopenMilestone(
  org: string,
  user: string,
  projectId: string,
  milestoneId: string,
) {
  await getMongooseConnection();

  const rawUpdated = await MilestoneModel.findOneAndUpdate(
    {
      _id: oid(milestoneId),
      projectId: projectOid(projectId),
      organizationId: org,
    },
    {
      $set: {
        status: "in_progress",
        completedAt: null,
        completedByUserId: null,
        updatedByUserId: user,
      },
    },
    { new: true },
  ).lean();

  if (!rawUpdated) {
    throw new Error("MILESTONE_NOT_FOUND");
  }

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "milestone",
    entityId: rawUpdated._id,
    action: "reopened",
    metadata: { title: rawUpdated.title },
  });

  return rawUpdated;
}

export async function archiveMilestone(
  org: string,
  user: string,
  projectId: string,
  milestoneId: string,
) {
  await getMongooseConnection();

  const rawUpdated = await MilestoneModel.findOneAndUpdate(
    {
      _id: oid(milestoneId),
      projectId: projectOid(projectId),
      organizationId: org,
    },
    {
      $set: {
        archivedAt: new Date(),
        archivedByUserId: user,
        updatedByUserId: user,
      },
    },
    { new: true },
  ).lean();

  if (!rawUpdated) {
    throw new Error("MILESTONE_NOT_FOUND");
  }

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "milestone",
    entityId: rawUpdated._id,
    action: "archived",
  });

  return rawUpdated;
}
