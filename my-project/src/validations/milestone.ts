import { z } from "zod";

export const milestoneStatuses = [
  "upcoming",
  "in_progress",
  "completed",
  "overdue",
] as const;

export const milestoneInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Milestone title is required.")
    .max(160, "Milestone title must be at most 160 characters."),
  description: z.string().trim().max(5000).optional().default(""),
  dueDate: z.coerce.date({ message: "A valid due date is required for milestones." }),
  status: z.enum(["upcoming", "in_progress", "completed"]).default("upcoming"),
  order: z.number().int().default(0),
  targetAmountMinor: z.number().int().min(0).default(0),
  currency: z.string().length(3).default("USD"),
});

export type MilestoneInput = z.infer<typeof milestoneInputSchema>;

export const milestoneUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(5000).optional(),
  dueDate: z.coerce.date().optional(),
  status: z.enum(["upcoming", "in_progress", "completed"]).optional(),
  order: z.number().int().optional(),
  targetAmountMinor: z.number().int().min(0).optional(),
  currency: z.string().length(3).optional(),
});

export type MilestoneUpdateInput = z.infer<typeof milestoneUpdateSchema>;

export const milestoneListSchema = z.object({
  status: z.enum(["all", ...milestoneStatuses]).default("all"),
  view: z.enum(["active", "archived", "all"]).default("active"),
});

export type MilestoneListArgs = z.infer<typeof milestoneListSchema>;
