import { z } from "zod";

export const deliverableStatuses = [
  "draft",
  "in_progress",
  "submitted",
  "approved",
  "revision_required",
] as const;

export const allDeliverableStatuses = [...deliverableStatuses, "archived"] as const;

export type DeliverableStatus = (typeof allDeliverableStatuses)[number];

// Permitted status transitions to enforce workflow integrity
export const allowedStatusTransitions: Record<DeliverableStatus, DeliverableStatus[]> = {
  draft: ["in_progress", "submitted", "archived"],
  in_progress: ["draft", "submitted", "archived"],
  submitted: ["approved", "revision_required", "archived"],
  revision_required: ["in_progress", "submitted", "archived"],
  approved: ["archived"],
  archived: ["draft", "in_progress", "submitted", "revision_required", "approved"],
};

export function isValidTransition(
  current: DeliverableStatus,
  target: DeliverableStatus,
): boolean {
  if (current === target) return true;
  const allowed = allowedStatusTransitions[current];
  return allowed ? allowed.includes(target) : false;
}

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const externalLinkSchema = z.object({
  title: z.string().trim().min(1, "Link title is required").max(100),
  url: z.string().trim().url("Must be a valid URL").max(1000),
});

export const deliverableFileSchema = z.object({
  fileId: z.string().min(1),
  originalFilename: z.string().min(1).max(255),
  storageKey: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().int().min(1),
  checksum: z.string().optional(),
  versionNumber: z.number().int().min(1).default(1),
  uploadedByUserId: z.string().min(1),
  uploadedAt: z.coerce.date().default(() => new Date()),
  comment: z.string().max(2000).optional(),
});

export const deliverableReviewSchema = z.object({
  reviewId: z.string().min(1),
  action: z.enum(["submitted", "approved", "revision_requested", "resubmitted"]),
  actorUserId: z.string().min(1),
  comment: z.string().max(3000).optional(),
  versionNumber: z.number().int().min(1),
  occurredAt: z.coerce.date().default(() => new Date()),
});

export const deliverableInputSchema = z.object({
  projectId: z.string().regex(objectIdRegex, "Please select a valid project."),
  milestoneId: z
    .string()
    .regex(objectIdRegex, "Invalid milestone ID format.")
    .optional()
    .nullable(),
  title: z.string().trim().min(1, "Deliverable title is required").max(200),
  description: z.string().trim().max(5000).optional().default(""),
  status: z.enum(deliverableStatuses).default("draft"),
  contributorUserIds: z.array(z.string()).default([]),
  reviewerUserIds: z.array(z.string()).default([]),
  dueDate: z.coerce.date().optional().nullable(),
  externalLinks: z.array(externalLinkSchema).default([]),
});

export type DeliverableInput = z.infer<typeof deliverableInputSchema>;

export const deliverableUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  milestoneId: z
    .string()
    .regex(objectIdRegex, "Invalid milestone ID format.")
    .optional()
    .nullable(),
  contributorUserIds: z.array(z.string()).optional(),
  reviewerUserIds: z.array(z.string()).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  externalLinks: z.array(externalLinkSchema).optional(),
});

export type DeliverableUpdateInput = z.infer<typeof deliverableUpdateSchema>;

export const deliverableListSchema = z.object({
  status: z.enum(["all", ...deliverableStatuses]).default("all"),
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
  search: z.string().optional(),
  view: z.enum(["active", "archived", "all"]).default("active"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "dueDate", "title", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type DeliverableListArgs = z.infer<typeof deliverableListSchema>;

export const uploadUrlRequestSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required").max(255),
  mimeType: z.string().trim().min(1, "MIME type is required"),
  fileSize: z.number().int().min(1, "File size must be greater than zero"),
});

export type UploadUrlRequest = z.infer<typeof uploadUrlRequestSchema>;

export const completeUploadSchema = z.object({
  fileId: z.string().min(1),
  originalFilename: z.string().trim().min(1).max(255),
  storageKey: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().int().min(1),
  checksum: z.string().optional(),
  comment: z.string().trim().max(1000).optional(),
});

export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;

export const reviewActionSchema = z.object({
  comment: z.string().trim().max(3000).optional(),
});

export type ReviewActionInput = z.infer<typeof reviewActionSchema>;
