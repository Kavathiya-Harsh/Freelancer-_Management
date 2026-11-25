import "server-only";
import { Types } from "mongoose";
import { TaskModel, type TaskDocument } from "@/server/models/Task";
import { ProjectModel, type ProjectDocument } from "@/server/models/Project";
import { ActivityModel } from "@/server/models/Activity";
import { getMongooseConnection } from "@/server/db/mongoose";
import { getMongoDb } from "@/server/db/mongo-client";
import type { TaskInput, TaskListArgs, TaskUpdateInput } from "@/validations/task";
import { taskStatuses } from "@/validations/task";

type LeanTask = TaskDocument & { _id: Types.ObjectId };
type LeanProject = ProjectDocument & { _id: Types.ObjectId };

const oid = (v: string) => {
  if (!Types.ObjectId.isValid(v)) throw new Error("TASK_NOT_FOUND");
  return new Types.ObjectId(v);
};

const projectOid = (v: string) => {
  if (!Types.ObjectId.isValid(v)) throw new Error("PROJECT_NOT_FOUND");
  return new Types.ObjectId(v);
};

const normal = (s: string) => s.trim().toLowerCase();

export async function createTask(org: string, user: string, input: TaskInput) {
  await getMongooseConnection();

  // 1. Validate Project
  const project = (await ProjectModel.findOne({
    _id: projectOid(input.projectId),
    organizationId: org,
  }).lean()) as LeanProject | null;

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }
  if (project.archivedAt) {
    throw new Error("PROJECT_ARCHIVED");
  }

  // 2. Validate Assignees against workspace members
  if (input.assigneeUserIds && input.assigneeUserIds.length > 0) {
    const db = await getMongoDb();
    const count = await db.collection("member").countDocuments({
      organizationId: org,
      userId: { $in: input.assigneeUserIds },
    });
    if (count !== input.assigneeUserIds.length) {
      throw new Error("INVALID_ASSIGNEE");
    }

    // Check project assignment restrictions if project has assigned members
    if (project.memberUserIds && project.memberUserIds.length > 0) {
      const allowed = new Set(project.memberUserIds);
      for (const uid of input.assigneeUserIds) {
        if (!allowed.has(uid)) {
          throw new Error("ASSIGNEE_NOT_IN_PROJECT");
        }
      }
    }
  }

  const isDone = input.status === "done";
  const completedAt = isDone ? new Date() : null;
  const completedByUserId = isDone ? user : null;

  const task = await TaskModel.create({
    ...input,
    organizationId: org,
    projectId: projectOid(input.projectId),
    reporterUserId: user,
    completedAt,
    completedByUserId,
    createdByUserId: user,
    updatedByUserId: user,
    normalizedTitle: normal(input.title),
  });

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "task",
    entityId: task._id,
    action: "created",
    metadata: {
      title: task.title,
      projectId: task.projectId.toString(),
      projectName: project.name,
    },
  });

  return task.toObject();
}

export async function listTasks(org: string, args: TaskListArgs, memberUserId?: string) {
  await getMongooseConnection();

  const query: Record<string, unknown> = { organizationId: org };

  // View / archived filter
  if (args.view === "archived") {
    query.archivedAt = { $ne: null };
  } else if (args.view === "all") {
    // include both
  } else {
    query.archivedAt = null;
  }

  // If member role, member can only see tasks for projects they can access or tasks assigned to them
  if (memberUserId) {
    const accessibleProjects = (await ProjectModel.find({
      organizationId: org,
      memberUserIds: memberUserId,
    })
      .select("_id")
      .lean()) as unknown as Array<{ _id: Types.ObjectId }>;

    const accessibleProjectIds = accessibleProjects.map((p) => p._id);

    query.$or = [
      { projectId: { $in: accessibleProjectIds } },
      { assigneeUserIds: memberUserId },
    ];
  }

  // Filter by Project
  if (args.projectId) {
    query.projectId = projectOid(args.projectId);
  }

  // Filter by Status
  if (args.status && args.status !== "all") {
    query.status = args.status;
  }

  // Filter by Priority
  if (args.priority && args.priority !== "all") {
    query.priority = args.priority;
  }

  // Filter by Assignee
  if (args.assigneeId) {
    query.assigneeUserIds = args.assigneeId;
  }

  // Search by title or tags
  if (args.search) {
    const s = normal(args.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { normalizedTitle: { $regex: s } },
      { tags: { $in: [new RegExp(s, "i")] } },
    ];
  }

  // Sort
  const sort: Record<string, 1 | -1> =
    args.sort === "due_date"
      ? { dueDate: 1, _id: 1 }
      : args.sort === "priority"
        ? { priority: 1, _id: 1 }
        : args.sort === "title"
          ? { normalizedTitle: 1, _id: 1 }
          : args.sort === "updated"
            ? { updatedAt: -1, _id: -1 }
            : { createdAt: -1, _id: -1 };

  const page = Math.max(1, args.page || 1);
  const limit = Math.min(100, Math.max(1, args.limit || 50));
  const skip = (page - 1) * limit;

  const [rawItems, total] = await Promise.all([
    TaskModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
    TaskModel.countDocuments(query),
  ]);

  const items = rawItems as unknown as LeanTask[];

  // Populate Projects
  const projectIds = [
    ...new Set(items.map((t) => t.projectId?.toString()).filter(Boolean)),
  ];
  const rawProjects =
    projectIds.length > 0
      ? await ProjectModel.find({
          _id: { $in: projectIds.map((id) => projectOid(id)) },
        })
          .select("name projectCode status priority")
          .lean()
      : [];

  const projects = rawProjects as unknown as LeanProject[];
  const projectMap = new Map<string, LeanProject>();
  for (const p of projects) {
    projectMap.set(p._id.toString(), p);
  }

  // Populate Assignees
  const allAssigneeIds = [
    ...new Set(items.flatMap((t) => t.assigneeUserIds || []).filter(Boolean)),
  ];

  const db = await getMongoDb();
  const validObjectIds = allAssigneeIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  const users =
    allAssigneeIds.length > 0
      ? await db
          .collection("user")
          .find(
            validObjectIds.length > 0
              ? {
                  $or: [
                    { id: { $in: allAssigneeIds } },
                    { _id: { $in: validObjectIds } },
                  ],
                }
              : { id: { $in: allAssigneeIds } },
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

  const now = new Date();
  const enrichedItems = items.map((t) => {
    const project = t.projectId ? projectMap.get(t.projectId.toString()) : undefined;
    const assignees = (t.assigneeUserIds || [])
      .map((uid: string) => userMap.get(uid))
      .filter(Boolean);
    const isOverdue =
      t.status !== "done" && t.dueDate ? new Date(t.dueDate) < now : false;

    return {
      ...t,
      isOverdue,
      project: project
        ? {
            _id: project._id.toString(),
            name: project.name,
            projectCode: project.projectCode,
            status: project.status,
          }
        : null,
      assignees,
    };
  });

  // Calculate stats
  const baseStatsQuery: Record<string, unknown> = {
    organizationId: org,
    archivedAt: null,
  };
  if (args.projectId) {
    baseStatsQuery.projectId = projectOid(args.projectId);
  }

  const [
    totalTasks,
    todoCount,
    inProgressCount,
    inReviewCount,
    blockedCount,
    doneCount,
    overdueCount,
  ] = await Promise.all([
    TaskModel.countDocuments(baseStatsQuery),
    TaskModel.countDocuments({ ...baseStatsQuery, status: "todo" }),
    TaskModel.countDocuments({ ...baseStatsQuery, status: "in_progress" }),
    TaskModel.countDocuments({ ...baseStatsQuery, status: "in_review" }),
    TaskModel.countDocuments({ ...baseStatsQuery, status: "blocked" }),
    TaskModel.countDocuments({ ...baseStatsQuery, status: "done" }),
    TaskModel.countDocuments({
      ...baseStatsQuery,
      status: { $ne: "done" },
      dueDate: { $lt: now },
    }),
  ]);

  return {
    items: enrichedItems,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    stats: {
      total: totalTasks,
      todo: todoCount,
      inProgress: inProgressCount,
      inReview: inReviewCount,
      blocked: blockedCount,
      done: doneCount,
      overdue: overdueCount,
    },
  };
}

export async function getTaskById(org: string, taskId: string, memberUserId?: string) {
  await getMongooseConnection();

  const rawTask = await TaskModel.findOne({
    _id: oid(taskId),
    organizationId: org,
  }).lean();

  if (!rawTask) {
    throw new Error("TASK_NOT_FOUND");
  }

  const task = rawTask as unknown as LeanTask;

  // Validate Project
  const rawProject = await ProjectModel.findOne({
    _id: task.projectId,
    organizationId: org,
  }).lean();

  const project = rawProject as unknown as LeanProject | null;

  // If member, verify access
  if (memberUserId) {
    const isAssigned = task.assigneeUserIds?.includes(memberUserId);
    const inProject = project?.memberUserIds?.includes(memberUserId);
    if (!isAssigned && !inProject) {
      throw new Error("TASK_FORBIDDEN");
    }
  }

  // Populate Assignees
  const assigneeIds = task.assigneeUserIds || [];
  const db = await getMongoDb();
  const validObjectIds = assigneeIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  const users =
    assigneeIds.length > 0
      ? await db
          .collection("user")
          .find(
            validObjectIds.length > 0
              ? {
                  $or: [{ id: { $in: assigneeIds } }, { _id: { $in: validObjectIds } }],
                }
              : { id: { $in: assigneeIds } },
          )
          .project({ id: 1, _id: 1, name: 1, email: 1, image: 1 })
          .toArray()
      : [];

  const assignees = assigneeIds.map((uid) => {
    const u = users.find((usr) => String(usr.id ?? usr._id) === uid);
    return {
      userId: uid,
      name: u?.name || u?.email || uid,
      email: u?.email || "",
      image: u?.image || null,
    };
  });

  // Recent activity for this task
  const activities = await ActivityModel.find({
    organizationId: org,
    entityType: "task",
    entityId: task._id,
  })
    .sort({ occurredAt: -1 })
    .limit(10)
    .lean();

  const isOverdue =
    task.status !== "done" && task.dueDate ? new Date(task.dueDate) < new Date() : false;

  return {
    ...task,
    isOverdue,
    project: project
      ? {
          _id: project._id.toString(),
          name: project.name,
          projectCode: project.projectCode,
          status: project.status,
        }
      : null,
    assignees,
    activities,
  };
}

export async function updateTask(
  org: string,
  user: string,
  taskId: string,
  input: TaskUpdateInput,
  memberUserId?: string,
) {
  await getMongooseConnection();

  const rawExisting = await TaskModel.findOne({
    _id: oid(taskId),
    organizationId: org,
  }).lean();

  if (!rawExisting) {
    throw new Error("TASK_NOT_FOUND");
  }

  const existing = rawExisting as unknown as LeanTask;

  // Member permission check: members can only update tasks assigned to them
  if (memberUserId) {
    if (!existing.assigneeUserIds?.includes(memberUserId)) {
      throw new Error("TASK_FORBIDDEN");
    }
    // Members cannot change project association
    if (input.projectId && input.projectId !== existing.projectId.toString()) {
      throw new Error("TASK_FORBIDDEN");
    }
  }

  // Validate Project if changing
  if (input.projectId && input.projectId !== existing.projectId.toString()) {
    const project = await ProjectModel.findOne({
      _id: projectOid(input.projectId),
      organizationId: org,
    }).lean();
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    if (project.archivedAt) throw new Error("PROJECT_ARCHIVED");
  }

  // Validate Assignees if changing
  if (input.assigneeUserIds && input.assigneeUserIds.length > 0) {
    const db = await getMongoDb();
    const count = await db.collection("member").countDocuments({
      organizationId: org,
      userId: { $in: input.assigneeUserIds },
    });
    if (count !== input.assigneeUserIds.length) {
      throw new Error("INVALID_ASSIGNEE");
    }
  }

  // Handle status completion logic
  const updateData: Record<string, unknown> = {
    ...input,
    updatedByUserId: user,
  };

  if (input.title) {
    updateData.normalizedTitle = normal(input.title);
  }
  if (input.projectId) {
    updateData.projectId = projectOid(input.projectId);
  }

  if (input.status) {
    if (input.status === "done" && existing.status !== "done") {
      updateData.completedAt = new Date();
      updateData.completedByUserId = user;
    } else if (input.status !== "done" && existing.status === "done") {
      updateData.completedAt = null;
      updateData.completedByUserId = null;
    }
  }

  const rawUpdated = await TaskModel.findOneAndUpdate(
    { _id: existing._id, organizationId: org },
    { $set: updateData },
    { new: true, runValidators: true },
  ).lean();

  const updated = rawUpdated as unknown as LeanTask | null;

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "task",
    entityId: existing._id,
    action: "updated",
    metadata: {
      title: updated?.title,
      status: updated?.status,
      priority: updated?.priority,
    },
  });

  return updated;
}

export async function updateTaskStatus(
  org: string,
  user: string,
  taskId: string,
  newStatus: (typeof taskStatuses)[number],
  memberUserId?: string,
) {
  await getMongooseConnection();

  const rawExisting = await TaskModel.findOne({
    _id: oid(taskId),
    organizationId: org,
  }).lean();

  if (!rawExisting) {
    throw new Error("TASK_NOT_FOUND");
  }

  const existing = rawExisting as unknown as LeanTask;

  // Member can only change status if assigned to task
  if (memberUserId && !existing.assigneeUserIds?.includes(memberUserId)) {
    throw new Error("TASK_FORBIDDEN");
  }

  const isDone = newStatus === "done";
  const completedAt = isDone ? new Date() : null;
  const completedByUserId = isDone ? user : null;

  const rawUpdated = await TaskModel.findOneAndUpdate(
    { _id: existing._id, organizationId: org },
    {
      $set: {
        status: newStatus,
        completedAt,
        completedByUserId,
        updatedByUserId: user,
      },
    },
    { new: true },
  ).lean();

  const updated = rawUpdated as unknown as LeanTask | null;

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "task",
    entityId: existing._id,
    action: "status_changed",
    metadata: {
      fromStatus: existing.status,
      toStatus: newStatus,
      title: updated?.title,
    },
  });

  return updated;
}

export async function archiveTask(org: string, user: string, taskId: string) {
  await getMongooseConnection();

  const rawTask = await TaskModel.findOneAndUpdate(
    { _id: oid(taskId), organizationId: org },
    {
      $set: {
        archivedAt: new Date(),
        archivedByUserId: user,
        updatedByUserId: user,
      },
    },
    { new: true },
  ).lean();

  if (!rawTask) {
    throw new Error("TASK_NOT_FOUND");
  }

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "task",
    entityId: rawTask._id,
    action: "archived",
  });

  return rawTask;
}

export async function restoreTask(org: string, user: string, taskId: string) {
  await getMongooseConnection();

  const rawTask = await TaskModel.findOneAndUpdate(
    { _id: oid(taskId), organizationId: org },
    {
      $set: {
        archivedAt: null,
        archivedByUserId: null,
        updatedByUserId: user,
      },
    },
    { new: true },
  ).lean();

  if (!rawTask) {
    throw new Error("TASK_NOT_FOUND");
  }

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "task",
    entityId: rawTask._id,
    action: "restored",
  });

  return rawTask;
}

export async function getProjectTaskStats(org: string, projectId: string) {
  await getMongooseConnection();
  const pId = projectOid(projectId);
  const now = new Date();

  const base = { organizationId: org, projectId: pId, archivedAt: null };

  const [total, done, inProgress, todo, inReview, blocked, overdue] = await Promise.all([
    TaskModel.countDocuments(base),
    TaskModel.countDocuments({ ...base, status: "done" }),
    TaskModel.countDocuments({ ...base, status: "in_progress" }),
    TaskModel.countDocuments({ ...base, status: "todo" }),
    TaskModel.countDocuments({ ...base, status: "in_review" }),
    TaskModel.countDocuments({ ...base, status: "blocked" }),
    TaskModel.countDocuments({
      ...base,
      status: { $ne: "done" },
      dueDate: { $lt: now },
    }),
  ]);

  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  return {
    total,
    done,
    inProgress,
    todo,
    inReview,
    blocked,
    overdue,
    percentage,
  };
}
