import "server-only";
import { Types } from "mongoose";
import { randomUUID } from "node:crypto";
import { DeliverableModel, type DeliverableDocument } from "@/server/models/Deliverable";
import { ProjectModel, type ProjectDocument } from "@/server/models/Project";
import { MilestoneModel } from "@/server/models/Milestone";
import { ActivityModel } from "@/server/models/Activity";
import { getMongooseConnection } from "@/server/db/mongoose";
import { getMongoDb } from "@/server/db/mongo-client";
import {
  generatePresignedUploadUrl,
  verifyUploadedObject,
  generatePresignedDownloadUrl,
} from "@/server/storage/s3-provider";
import {
  isValidTransition,
  type DeliverableInput,
  type DeliverableUpdateInput,
  type DeliverableListArgs,
  type UploadUrlRequest,
  type CompleteUploadInput,
  type DeliverableStatus,
} from "@/validations/deliverable";

type LeanDeliverable = DeliverableDocument & { _id: Types.ObjectId };
type LeanProject = ProjectDocument & { _id: Types.ObjectId };

const oid = (v: string) => {
  if (!Types.ObjectId.isValid(v)) throw new Error("DELIVERABLE_NOT_FOUND");
  return new Types.ObjectId(v);
};

const projectOid = (v: string) => {
  if (!Types.ObjectId.isValid(v)) throw new Error("PROJECT_NOT_FOUND");
  return new Types.ObjectId(v);
};

const normal = (s: string) => s.trim().toLowerCase();

/**
 * Validates that specified user IDs are active members of the workspace.
 */
async function validateWorkspaceMembers(org: string, userIds: string[]) {
  if (!userIds || userIds.length === 0) return;
  const db = await getMongoDb();
  const members = await db
    .collection("member")
    .find({ organizationId: org, userId: { $in: userIds } })
    .project({ userId: 1 })
    .toArray();

  const foundIds = new Set(members.map((m) => m.userId));
  for (const uid of userIds) {
    if (!foundIds.has(uid)) {
      throw new Error("INVALID_WORKSPACE_MEMBER");
    }
  }
}

/**
 * Checks if user is authorized to view or edit deliverable based on workspace role
 * and project / assignment scope.
 */
function assertDeliverableAccess(
  deliv: LeanDeliverable,
  userId: string,
  userRole?: string,
  requireEdit = false,
) {
  if (userRole === "owner" || userRole === "admin") return;

  const isContributor = deliv.contributorUserIds.includes(userId);
  const isReviewer = deliv.reviewerUserIds.includes(userId);

  if (requireEdit) {
    if (!isContributor) {
      throw new Error("DELIVERABLE_FORBIDDEN");
    }
  } else {
    if (!isContributor && !isReviewer) {
      throw new Error("DELIVERABLE_FORBIDDEN");
    }
  }
}

export async function createDeliverable(
  org: string,
  user: string,
  input: DeliverableInput,
) {
  await getMongooseConnection();

  // 1. Verify Project
  const project = (await ProjectModel.findOne({
    _id: projectOid(input.projectId),
    organizationId: org,
  }).lean()) as LeanProject | null;

  if (!project) throw new Error("PROJECT_NOT_FOUND");
  if (project.archivedAt) throw new Error("PROJECT_ARCHIVED");

  // 2. Verify optional Milestone
  let milestoneObjectId: Types.ObjectId | null = null;
  if (input.milestoneId) {
    if (!Types.ObjectId.isValid(input.milestoneId)) {
      throw new Error("MILESTONE_NOT_FOUND");
    }
    const ms = await MilestoneModel.findOne({
      _id: new Types.ObjectId(input.milestoneId),
      organizationId: org,
      projectId: project._id,
    }).lean();

    if (!ms) throw new Error("MILESTONE_NOT_FOUND");
    milestoneObjectId = ms._id as unknown as Types.ObjectId;
  }

  // 3. Verify contributors & reviewers
  const allUserIds = [
    ...(input.contributorUserIds || []),
    ...(input.reviewerUserIds || []),
  ];
  await validateWorkspaceMembers(org, allUserIds);

  // 4. Create Deliverable
  const deliverable = await DeliverableModel.create({
    organizationId: org,
    projectId: project._id,
    milestoneId: milestoneObjectId,
    title: input.title,
    normalizedTitle: normal(input.title),
    description: input.description || "",
    status: input.status || "draft",
    contributorUserIds: input.contributorUserIds || [],
    reviewerUserIds: input.reviewerUserIds || [],
    dueDate: input.dueDate || null,
    currentVersion: 1,
    files: [],
    reviews: [],
    externalLinks: input.externalLinks || [],
    createdByUserId: user,
    updatedByUserId: user,
  });

  // 5. Activity log
  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "deliverable",
    entityId: deliverable._id,
    action: "created",
    metadata: {
      title: deliverable.title,
      projectId: project._id.toString(),
      status: deliverable.status,
    },
  });

  return deliverable.toObject();
}

export async function listDeliverables(
  org: string,
  user: string,
  args: DeliverableListArgs,
  userRole?: string,
) {
  await getMongooseConnection();

  const filter: Record<string, unknown> = { organizationId: org };

  // View filter
  if (args.view === "active") {
    filter.archivedAt = null;
  } else if (args.view === "archived") {
    filter.archivedAt = { $ne: null };
  }

  // Status filter
  if (args.status && args.status !== "all") {
    filter.status = args.status;
  }

  // Project filter
  if (args.projectId) {
    filter.projectId = projectOid(args.projectId);
  }

  // Milestone filter
  if (args.milestoneId) {
    if (Types.ObjectId.isValid(args.milestoneId)) {
      filter.milestoneId = new Types.ObjectId(args.milestoneId);
    }
  }

  // Search filter
  if (args.search?.trim()) {
    filter.normalizedTitle = { $regex: normal(args.search) };
  }

  // Role scoping: non-admin/owner only sees assigned or permitted project deliverables
  if (userRole !== "owner" && userRole !== "admin") {
    filter.$or = [
      { contributorUserIds: user },
      { reviewerUserIds: user },
      { createdByUserId: user },
    ];
  }

  const sortOrder = args.sortOrder === "asc" ? 1 : -1;
  const sortObj: Record<string, 1 | -1> = { [args.sortBy]: sortOrder };

  const skip = (args.page - 1) * args.limit;

  const [items, total] = await Promise.all([
    DeliverableModel.find(filter).sort(sortObj).skip(skip).limit(args.limit).lean(),
    DeliverableModel.countDocuments(filter),
  ]);

  // Enrich with project names & member lookup
  const projectIds = Array.from(new Set(items.map((i) => i.projectId.toString())));
  const projects = await ProjectModel.find({
    _id: { $in: projectIds.map((p) => new Types.ObjectId(p)) },
  })
    .select("name projectCode status")
    .lean();

  const projectMap = new Map(projects.map((p) => [p._id.toString(), p]));

  const enrichedItems = items.map((item) => {
    const proj = projectMap.get(item.projectId.toString());
    return {
      ...item,
      project: proj
        ? { _id: proj._id.toString(), name: proj.name, projectCode: proj.projectCode }
        : null,
      fileCount: item.files?.length || 0,
      linkCount: item.externalLinks?.length || 0,
    };
  });

  return {
    items: enrichedItems,
    pagination: {
      page: args.page,
      limit: args.limit,
      total,
      totalPages: Math.ceil(total / args.limit) || 1,
    },
  };
}

export async function getDeliverableById(
  org: string,
  id: string,
  userRole?: string,
  userId?: string,
) {
  await getMongooseConnection();

  const deliverable = (await DeliverableModel.findOne({
    _id: oid(id),
    organizationId: org,
  }).lean()) as LeanDeliverable | null;

  if (!deliverable) throw new Error("DELIVERABLE_NOT_FOUND");

  if (userId) {
    assertDeliverableAccess(deliverable, userId, userRole, false);
  }

  // Lookup Project
  const project = await ProjectModel.findOne({
    _id: deliverable.projectId,
    organizationId: org,
  })
    .select("name projectCode status clientId")
    .lean();

  // Lookup Milestone if assigned
  let milestone = null;
  if (deliverable.milestoneId) {
    milestone = await MilestoneModel.findOne({
      _id: deliverable.milestoneId,
      projectId: deliverable.projectId,
      organizationId: org,
    })
      .select("title dueDate status order")
      .lean();
  }

  // Lookup Workspace Member Details for Contributors & Reviewers
  const allUserIds = Array.from(
    new Set([
      ...deliverable.contributorUserIds,
      ...deliverable.reviewerUserIds,
      deliverable.createdByUserId,
      ...deliverable.files.map((f) => f.uploadedByUserId),
      ...deliverable.reviews.map((r) => r.actorUserId),
    ]),
  );

  const db = await getMongoDb();
  const validObjectIds = allUserIds
    .filter((uid) => Types.ObjectId.isValid(uid))
    .map((uid) => new Types.ObjectId(uid));

  const users = await db
    .collection("user")
    .find({
      $or: [
        { id: { $in: allUserIds } },
        ...(validObjectIds.length > 0 ? [{ _id: { $in: validObjectIds } }] : []),
      ],
    })
    .project({ id: 1, name: 1, email: 1, image: 1 })
    .toArray();

  const userMap = new Map();
  for (const u of users) {
    const key = u.id || u._id.toString();
    userMap.set(key, {
      userId: key,
      name: u.name,
      email: u.email,
      image: u.image || null,
    });
  }

  // Lookup recent Activities
  const activities = await ActivityModel.find({
    organizationId: org,
    entityType: "deliverable",
    entityId: deliverable._id,
  })
    .sort({ occurredAt: -1 })
    .limit(30)
    .lean();

  return {
    ...deliverable,
    project: project
      ? {
          _id: project._id.toString(),
          name: project.name,
          projectCode: project.projectCode,
          status: project.status,
        }
      : null,
    milestone: milestone
      ? {
          _id: milestone._id.toString(),
          title: milestone.title,
          dueDate: milestone.dueDate,
          status: milestone.status,
        }
      : null,
    contributors: deliverable.contributorUserIds.map(
      (uid) => userMap.get(uid) || { userId: uid, name: uid, email: uid },
    ),
    reviewers: deliverable.reviewerUserIds.map(
      (uid) => userMap.get(uid) || { userId: uid, name: uid, email: uid },
    ),
    activities,
  };
}

export async function updateDeliverable(
  org: string,
  user: string,
  id: string,
  input: DeliverableUpdateInput,
  userRole?: string,
) {
  await getMongooseConnection();

  const existing = (await DeliverableModel.findOne({
    _id: oid(id),
    organizationId: org,
  }).lean()) as LeanDeliverable | null;

  if (!existing) throw new Error("DELIVERABLE_NOT_FOUND");
  if (existing.archivedAt) throw new Error("DELIVERABLE_ARCHIVED");

  assertDeliverableAccess(existing, user, userRole, true);

  if (existing.status === "approved" && userRole !== "owner" && userRole !== "admin") {
    throw new Error("CANNOT_EDIT_APPROVED_DELIVERABLE");
  }

  // Validate member changes if specified
  const allUserIds = [
    ...(input.contributorUserIds || []),
    ...(input.reviewerUserIds || []),
  ];
  if (allUserIds.length > 0) {
    await validateWorkspaceMembers(org, allUserIds);
  }

  const updateFields: Record<string, unknown> = {
    updatedByUserId: user,
  };

  if (input.title !== undefined) {
    updateFields.title = input.title;
    updateFields.normalizedTitle = normal(input.title);
  }
  if (input.description !== undefined) updateFields.description = input.description;
  if (input.dueDate !== undefined) updateFields.dueDate = input.dueDate;
  if (input.contributorUserIds !== undefined)
    updateFields.contributorUserIds = input.contributorUserIds;
  if (input.reviewerUserIds !== undefined)
    updateFields.reviewerUserIds = input.reviewerUserIds;
  if (input.externalLinks !== undefined) updateFields.externalLinks = input.externalLinks;

  const updated = await DeliverableModel.findOneAndUpdate(
    { _id: existing._id, organizationId: org },
    { $set: updateFields },
    { new: true, runValidators: true },
  ).lean();

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "deliverable",
    entityId: existing._id,
    action: "updated",
    metadata: {
      updatedFields: Object.keys(updateFields).filter((k) => k !== "updatedByUserId"),
    },
  });

  return updated;
}

export async function submitDeliverable(
  org: string,
  user: string,
  id: string,
  comment?: string,
  userRole?: string,
) {
  await getMongooseConnection();

  const existing = (await DeliverableModel.findOne({
    _id: oid(id),
    organizationId: org,
  }).lean()) as LeanDeliverable | null;

  if (!existing) throw new Error("DELIVERABLE_NOT_FOUND");
  if (existing.archivedAt) throw new Error("DELIVERABLE_ARCHIVED");

  assertDeliverableAccess(existing, user, userRole, true);

  const isResubmission = existing.status === "revision_required";

  if (!isValidTransition(existing.status as DeliverableStatus, "submitted")) {
    throw new Error(`INVALID_STATUS_TRANSITION: Cannot submit from ${existing.status}`);
  }

  const reviewEntry = {
    reviewId: randomUUID(),
    action: isResubmission ? "resubmitted" : "submitted",
    actorUserId: user,
    comment: comment || "",
    versionNumber: existing.currentVersion,
    occurredAt: new Date(),
  };

  const updated = await DeliverableModel.findOneAndUpdate(
    { _id: existing._id, organizationId: org },
    {
      $set: {
        status: "submitted",
        submittedAt: new Date(),
        updatedByUserId: user,
      },
      $push: { reviews: reviewEntry },
    },
    { new: true },
  ).lean();

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "deliverable",
    entityId: existing._id,
    action: isResubmission ? "resubmitted" : "submitted",
    metadata: {
      versionNumber: existing.currentVersion,
      comment: comment || "",
    },
  });

  return updated;
}

export async function approveDeliverable(
  org: string,
  user: string,
  id: string,
  comment?: string,
  userRole?: string,
) {
  await getMongooseConnection();

  const existing = (await DeliverableModel.findOne({
    _id: oid(id),
    organizationId: org,
  }).lean()) as LeanDeliverable | null;

  if (!existing) throw new Error("DELIVERABLE_NOT_FOUND");
  if (existing.archivedAt) throw new Error("DELIVERABLE_ARCHIVED");

  if (existing.status !== "submitted") {
    throw new Error(
      `INVALID_STATUS_TRANSITION: Only submitted deliverables can be approved.`,
    );
  }

  const isReviewer = existing.reviewerUserIds.includes(user);
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

  if (!isReviewer && !isOwnerOrAdmin) {
    throw new Error("REVIEW_FORBIDDEN: You are not assigned as a reviewer.");
  }

  // Prevent contributor from approving their own work unless Owner/Admin
  if (existing.contributorUserIds.includes(user) && !isOwnerOrAdmin) {
    throw new Error(
      "CANNOT_SELF_APPROVE: Contributors cannot approve their own deliverables.",
    );
  }

  const reviewEntry = {
    reviewId: randomUUID(),
    action: "approved",
    actorUserId: user,
    comment: comment || "",
    versionNumber: existing.currentVersion,
    occurredAt: new Date(),
  };

  const updated = await DeliverableModel.findOneAndUpdate(
    { _id: existing._id, organizationId: org },
    {
      $set: {
        status: "approved",
        approvedAt: new Date(),
        updatedByUserId: user,
      },
      $push: { reviews: reviewEntry },
    },
    { new: true },
  ).lean();

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "deliverable",
    entityId: existing._id,
    action: "approved",
    metadata: {
      versionNumber: existing.currentVersion,
      comment: comment || "",
    },
  });

  return updated;
}

export async function requestRevision(
  org: string,
  user: string,
  id: string,
  comment: string,
  userRole?: string,
) {
  await getMongooseConnection();

  const existing = (await DeliverableModel.findOne({
    _id: oid(id),
    organizationId: org,
  }).lean()) as LeanDeliverable | null;

  if (!existing) throw new Error("DELIVERABLE_NOT_FOUND");
  if (existing.archivedAt) throw new Error("DELIVERABLE_ARCHIVED");

  if (existing.status !== "submitted") {
    throw new Error(
      `INVALID_STATUS_TRANSITION: Revisions can only be requested on submitted deliverables.`,
    );
  }

  const isReviewer = existing.reviewerUserIds.includes(user);
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

  if (!isReviewer && !isOwnerOrAdmin) {
    throw new Error("REVIEW_FORBIDDEN: You are not assigned as a reviewer.");
  }

  const reviewEntry = {
    reviewId: randomUUID(),
    action: "revision_requested",
    actorUserId: user,
    comment: comment || "",
    versionNumber: existing.currentVersion,
    occurredAt: new Date(),
  };

  // Increment currentVersion for the upcoming revision
  const newVersion = existing.currentVersion + 1;

  const updated = await DeliverableModel.findOneAndUpdate(
    { _id: existing._id, organizationId: org },
    {
      $set: {
        status: "revision_required",
        currentVersion: newVersion,
        updatedByUserId: user,
      },
      $push: { reviews: reviewEntry },
    },
    { new: true },
  ).lean();

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "deliverable",
    entityId: existing._id,
    action: "revision_requested",
    metadata: {
      comment: comment || "",
      newVersionNumber: newVersion,
    },
  });

  return updated;
}

export async function archiveDeliverable(
  org: string,
  user: string,
  id: string,
  userRole?: string,
) {
  if (userRole !== "owner" && userRole !== "admin") {
    throw new Error("PERMISSION_DENIED");
  }

  await getMongooseConnection();
  const existing = await DeliverableModel.findOne({
    _id: oid(id),
    organizationId: org,
  });

  if (!existing) throw new Error("DELIVERABLE_NOT_FOUND");

  existing.archivedAt = new Date();
  existing.archivedByUserId = user;
  existing.updatedByUserId = user;
  await existing.save();

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "deliverable",
    entityId: existing._id,
    action: "archived",
  });

  return existing.toObject();
}

export async function restoreDeliverable(
  org: string,
  user: string,
  id: string,
  userRole?: string,
) {
  if (userRole !== "owner" && userRole !== "admin") {
    throw new Error("PERMISSION_DENIED");
  }

  await getMongooseConnection();
  const existing = await DeliverableModel.findOne({
    _id: oid(id),
    organizationId: org,
  });

  if (!existing) throw new Error("DELIVERABLE_NOT_FOUND");

  existing.archivedAt = null;
  existing.archivedByUserId = null;
  existing.updatedByUserId = user;
  await existing.save();

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "deliverable",
    entityId: existing._id,
    action: "restored",
  });

  return existing.toObject();
}

export async function requestFileUploadUrl(
  org: string,
  user: string,
  id: string,
  fileInfo: UploadUrlRequest,
  userRole?: string,
) {
  await getMongooseConnection();

  const existing = (await DeliverableModel.findOne({
    _id: oid(id),
    organizationId: org,
  }).lean()) as LeanDeliverable | null;

  if (!existing) throw new Error("DELIVERABLE_NOT_FOUND");
  if (existing.archivedAt) throw new Error("DELIVERABLE_ARCHIVED");

  assertDeliverableAccess(existing, user, userRole, true);

  if (existing.status === "approved" && userRole !== "owner" && userRole !== "admin") {
    throw new Error("CANNOT_UPLOAD_TO_APPROVED_DELIVERABLE");
  }

  return await generatePresignedUploadUrl({
    organizationId: org,
    deliverableId: existing._id.toString(),
    originalFilename: fileInfo.filename,
    mimeType: fileInfo.mimeType,
    fileSize: fileInfo.fileSize,
  });
}

export async function completeFileUpload(
  org: string,
  user: string,
  id: string,
  fileData: CompleteUploadInput,
  userRole?: string,
) {
  await getMongooseConnection();

  const existing = (await DeliverableModel.findOne({
    _id: oid(id),
    organizationId: org,
  }).lean()) as LeanDeliverable | null;

  if (!existing) throw new Error("DELIVERABLE_NOT_FOUND");
  if (existing.archivedAt) throw new Error("DELIVERABLE_ARCHIVED");

  assertDeliverableAccess(existing, user, userRole, true);

  // 1. Verify storage object presence and size
  const verification = await verifyUploadedObject(fileData.storageKey, fileData.fileSize);

  if (!verification.verified) {
    throw new Error("UPLOAD_VERIFICATION_FAILED: Stored object could not be verified.");
  }

  // 2. Prepare file metadata record
  const fileRecord = {
    fileId: fileData.fileId,
    originalFilename: fileData.originalFilename,
    storageKey: fileData.storageKey,
    mimeType: fileData.mimeType,
    fileSize: fileData.fileSize,
    checksum: fileData.checksum,
    versionNumber: existing.currentVersion,
    uploadedByUserId: user,
    uploadedAt: new Date(),
    comment: fileData.comment,
  };

  // 3. Atomically append file record
  const updated = await DeliverableModel.findOneAndUpdate(
    { _id: existing._id, organizationId: org },
    {
      $push: { files: fileRecord },
      $set: { updatedByUserId: user },
    },
    { new: true },
  ).lean();

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "deliverable",
    entityId: existing._id,
    action: "file_uploaded",
    metadata: {
      fileId: fileData.fileId,
      filename: fileData.originalFilename,
      fileSize: fileData.fileSize,
      versionNumber: existing.currentVersion,
    },
  });

  return updated;
}

export async function getFileDownloadUrl(
  org: string,
  user: string,
  id: string,
  fileId: string,
  userRole?: string,
) {
  await getMongooseConnection();

  const existing = (await DeliverableModel.findOne({
    _id: oid(id),
    organizationId: org,
  }).lean()) as LeanDeliverable | null;

  if (!existing) throw new Error("DELIVERABLE_NOT_FOUND");

  assertDeliverableAccess(existing, user, userRole, false);

  const file = existing.files.find((f) => f.fileId === fileId);
  if (!file) throw new Error("FILE_NOT_FOUND");

  return await generatePresignedDownloadUrl(file.storageKey, file.originalFilename);
}

export async function getDeliverableStats(org: string, projectId?: string) {
  await getMongooseConnection();

  const match: Record<string, unknown> = {
    organizationId: org,
    archivedAt: null,
  };

  if (projectId && Types.ObjectId.isValid(projectId)) {
    match.projectId = new Types.ObjectId(projectId);
  }

  const [total, draft, inProgress, submitted, approved, revisionRequired] =
    await Promise.all([
      DeliverableModel.countDocuments(match),
      DeliverableModel.countDocuments({ ...match, status: "draft" }),
      DeliverableModel.countDocuments({ ...match, status: "in_progress" }),
      DeliverableModel.countDocuments({ ...match, status: "submitted" }),
      DeliverableModel.countDocuments({ ...match, status: "approved" }),
      DeliverableModel.countDocuments({ ...match, status: "revision_required" }),
    ]);

  return {
    total,
    draft,
    inProgress,
    submitted,
    approved,
    revisionRequired,
  };
}
