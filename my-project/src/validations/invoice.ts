import { z } from "zod";

export const invoiceStatuses = ["draft", "pending", "paid", "overdue", "void"] as const;

export type InvoiceStatus = (typeof invoiceStatuses)[number];

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const lineItemInputSchema = z.object({
  description: z.string().trim().min(1, "Item description is required").max(300),
  quantityMilli: z.coerce
    .number()
    .int()
    .min(1, "Quantity must be greater than zero")
    .default(1000),
  unitAmountMinor: z.coerce.number().int().min(0, "Unit price must be non-negative"),
  lineDiscountMinor: z.coerce.number().int().min(0).default(0),
  taxRateBasisPoints: z.coerce
    .number()
    .int()
    .min(0, "Tax rate cannot be negative")
    .max(10000, "Tax rate cannot exceed 100%")
    .default(0),
});

export type LineItemInput = z.infer<typeof lineItemInputSchema>;

export const invoiceInputSchema = z
  .object({
    clientId: z.string().regex(objectIdRegex, "Please select a valid client."),
    projectId: z
      .string()
      .regex(objectIdRegex, "Invalid project ID format.")
      .optional()
      .nullable(),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .length(3, "Currency code must be 3 letters")
      .default("USD"),
    issueDate: z.coerce.date().default(() => new Date()),
    dueDate: z.coerce.date(),
    lineItems: z
      .array(lineItemInputSchema)
      .min(1, "At least one line item is required on an invoice."),
    notes: z.string().trim().max(2000).optional().default(""),
    terms: z.string().trim().max(2000).optional().default(""),
  })
  .refine(
    (data) => {
      if (!data.issueDate || !data.dueDate) return true;
      return new Date(data.dueDate).getTime() >= new Date(data.issueDate).getTime();
    },
    {
      message: "Due date must be on or after the issue date.",
      path: ["dueDate"],
    },
  );

export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

export const invoiceUpdateSchema = z
  .object({
    clientId: z.string().regex(objectIdRegex).optional(),
    projectId: z.string().regex(objectIdRegex).optional().nullable(),
    currency: z.string().trim().toUpperCase().length(3).optional(),
    issueDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    lineItems: z.array(lineItemInputSchema).min(1).optional(),
    notes: z.string().trim().max(2000).optional(),
    terms: z.string().trim().max(2000).optional(),
  })
  .refine(
    (data) => {
      if (!data.issueDate || !data.dueDate) return true;
      return new Date(data.dueDate).getTime() >= new Date(data.issueDate).getTime();
    },
    {
      message: "Due date must be on or after the issue date.",
      path: ["dueDate"],
    },
  );

export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;

export const invoiceListSchema = z.object({
  status: z.enum(["all", ...invoiceStatuses]).default("all"),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  search: z.string().optional(),
  view: z.enum(["active", "archived", "all"]).default("active"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(["createdAt", "dueDate", "issueDate", "totalMinor", "invoiceNumber"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type InvoiceListArgs = z.infer<typeof invoiceListSchema>;
