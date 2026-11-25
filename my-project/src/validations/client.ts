import { z } from "zod";
const optionalText = z.string().trim().max(200).optional().or(z.literal(""));
export const clientInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  companyName: optionalText,
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: optionalText,
  website: z.string().trim().url().max(2048).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  billingAddress: z
    .object({
      addressLine1: optionalText,
      addressLine2: optionalText,
      city: optionalText,
      state: optionalText,
      postalCode: optionalText,
      country: optionalText,
    })
    .optional(),
});
export const clientListSchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(["active", "archived", "all"]).default("active"),
  sort: z.enum(["created", "updated", "name"]).default("created"),
  cursor: z.string().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ClientInput = z.infer<typeof clientInputSchema>;
