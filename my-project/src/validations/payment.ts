import { z } from "zod";

export const paymentMethods = [
  "cash",
  "bank_transfer",
  "upi",
  "cheque",
  "other",
] as const;

export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentStatuses = ["pending", "successful", "failed", "reversed"] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const paymentInputSchema = z.object({
  invoiceId: z.string().regex(objectIdRegex, "Valid invoice ID is required."),
  amountMinor: z.coerce
    .number()
    .int()
    .min(1, "Payment amount must be greater than zero."),
  paymentMethod: z.enum(paymentMethods, {
    message: "Please select a valid payment method.",
  }),
  paymentDate: z.coerce.date().default(() => new Date()),
  status: z.enum(paymentStatuses).default("successful"),
  reference: z.string().trim().max(100).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  idempotencyKey: z.string().trim().max(100).optional(),
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;

export const paymentStatusUpdateSchema = z.object({
  status: z.enum(["pending", "successful", "failed"], {
    message: "Permitted target statuses: pending, successful, failed.",
  }),
});

export type PaymentStatusUpdateInput = z.infer<typeof paymentStatusUpdateSchema>;

export const paymentReversalSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Reversal reason must be at least 3 characters.")
    .max(500),
});

export type PaymentReversalInput = z.infer<typeof paymentReversalSchema>;

export const paymentListSchema = z.object({
  invoiceId: z.string().optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  status: z.enum(["all", ...paymentStatuses]).default("all"),
  paymentMethod: z.enum(["all", ...paymentMethods]).default("all"),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaymentListArgs = z.infer<typeof paymentListSchema>;
