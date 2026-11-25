import { z } from "zod";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform(normalizeEmail);

export const passwordSchema = z.string().superRefine((password, context) => {
  const length = Array.from(password).length;
  if (length < 12 || length > 128) {
    context.addIssue({
      code: "custom",
      message: "Password must be between 12 and 128 characters.",
    });
  }
  if (!/\p{Ll}/u.test(password)) {
    context.addIssue({ code: "custom", message: "Password must include a lowercase letter." });
  }
  if (!/\p{Lu}/u.test(password)) {
    context.addIssue({ code: "custom", message: "Password must include an uppercase letter." });
  }
  if (!/\p{N}/u.test(password)) {
    context.addIssue({ code: "custom", message: "Password must include a number." });
  }
  if (!/[^\p{L}\p{N}]/u.test(password)) {
    context.addIssue({ code: "custom", message: "Password must include a symbol." });
  }
});

export const registerInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  password: passwordSchema,
});

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
