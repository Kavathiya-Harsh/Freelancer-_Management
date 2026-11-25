import { z } from "zod";

export const taskStatuses = [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
] as const;

export const taskPriorities = ["low", "medium", "high", "urgent"] as const;

export const taskInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Task title is required.")
      .max(200, "Task title must be at most 200 characters."),
    description: z.string().trim().max(5000).optional().default(""),
    projectId: z.string().regex(/^[a-f\d]{24}$/i, "Please select a valid project."),
    status: z.enum(taskStatuses).default("todo"),
    priority: z.enum(taskPriorities).default("medium"),
    assigneeUserIds: z.array(z.string().min(1)).max(20).default([]),
    startDate: z.coerce.date().nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    estimatedMinutes: z
      .number()
      .int()
      .min(0, "Estimated time cannot be negative.")
      .max(100000)
      .default(0),
    actualMinutes: z
      .number()
      .int()
      .min(0, "Actual time cannot be negative.")
      .max(100000)
      .default(0),
    progressPercent: z.number().int().min(0).max(100).default(0),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  })
  .refine(
    (v) => !v.startDate || !v.dueDate || new Date(v.dueDate) >= new Date(v.startDate),
    {
      message: "Due date must be on or after start date.",
      path: ["dueDate"],
    },
  );

export type TaskInput = z.infer<typeof taskInputSchema>;

export const taskUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    projectId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
    status: z.enum(taskStatuses).optional(),
    priority: z.enum(taskPriorities).optional(),
    assigneeUserIds: z.array(z.string().min(1)).max(20).optional(),
    startDate: z.coerce.date().nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    estimatedMinutes: z.number().int().min(0).max(100000).optional(),
    actualMinutes: z.number().int().min(0).max(100000).optional(),
    progressPercent: z.number().int().min(0).max(100).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  })
  .refine(
    (v) => !v.startDate || !v.dueDate || new Date(v.dueDate) >= new Date(v.startDate),
    {
      message: "Due date must be on or after start date.",
      path: ["dueDate"],
    },
  );

export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

export const taskStatusUpdateSchema = z.object({
  status: z.enum(taskStatuses),
});

export const taskListSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["all", ...taskStatuses]).default("all"),
  priority: z.enum(["all", ...taskPriorities]).default("all"),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  view: z.enum(["active", "archived", "all"]).default("active"),
  sort: z
    .enum(["recently_created", "due_date", "priority", "title", "updated"])
    .default("recently_created"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type TaskListArgs = z.infer<typeof taskListSchema>;