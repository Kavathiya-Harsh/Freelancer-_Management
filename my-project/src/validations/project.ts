import { z } from "zod";

export const projectStatuses = [
  "planning",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export const projectPriorities = ["low", "medium", "high", "urgent"] as const;

export const projectInputSchema = z
  .object({
    clientId: z.string().regex(/^[a-f\d]{24}$/i, "Please select a valid client."),
    projectCode: z
      .string()
      .trim()
      .max(32, "Project code must be at most 32 characters.")
      .regex(
        /^$|^[A-Z0-9-]+$/,
        "Project code must contain only uppercase letters, numbers, and hyphens.",
      )
      .optional()
      .or(z.literal("")),
    name: z
      .string()
      .trim()
      .min(1, "Project name is required.")
      .max(160, "Project name must be at most 160 characters."),
    description: z.string().trim().max(5000).optional().default(""),
    status: z.enum(projectStatuses).default("planning"),
    priority: z.enum(projectPriorities).default("medium"),
    budgetMinor: z.number().int().min(0, "Budget cannot be negative.").default(0),
    currency: z.string().length(3).default("USD"),
    minorUnit: z.number().int().min(0).max(3).default(2),
    startDate: z.coerce.date().nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    progressPercent: z
      .number()
      .int()
      .min(0, "Progress must be between 0 and 100.")
      .max(100, "Progress must be between 0 and 100.")
      .default(0),
    memberUserIds: z.array(z.string().min(1)).max(100).default([]),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  })
  .refine(
    (v) => !v.startDate || !v.dueDate || new Date(v.dueDate) >= new Date(v.startDate),
    {
      message: "Deadline must be on or after start date.",
      path: ["dueDate"],
    },
  );

export type ProjectInput = z.infer<typeof projectInputSchema>;

export const projectUpdateSchema = z
  .object({
    clientId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "Please select a valid client.")
      .optional(),
    projectCode: z
      .string()
      .trim()
      .min(2)
      .max(32)
      .regex(
        /^[A-Z0-9-]+$/,
        "Project code must contain only uppercase letters, numbers, and hyphens.",
      )
      .optional(),
    name: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(5000).optional(),
    status: z.enum(projectStatuses).optional(),
    priority: z.enum(projectPriorities).optional(),
    budgetMinor: z.number().int().min(0).optional(),
    currency: z.string().length(3).optional(),
    minorUnit: z.number().int().min(0).max(3).optional(),
    startDate: z.coerce.date().nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    progressPercent: z.number().int().min(0).max(100).optional(),
    memberUserIds: z.array(z.string().min(1)).max(100).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  })
  .refine(
    (v) => !v.startDate || !v.dueDate || new Date(v.dueDate) >= new Date(v.startDate),
    {
      message: "Deadline must be on or after start date.",
      path: ["dueDate"],
    },
  );

export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

export const projectListSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["all", ...projectStatuses, "archived"]).default("all"),
  priority: z.enum(["all", ...projectPriorities]).default("all"),
  clientId: z.string().optional(),
  view: z.enum(["active", "archived", "all"]).default("active"),
  sort: z
    .enum(["recently_created", "name", "deadline", "updated"])
    .default("recently_created"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  stats: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export type ProjectListArgs = z.infer<typeof projectListSchema>;
