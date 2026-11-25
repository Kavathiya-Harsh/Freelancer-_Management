import "server-only";
import { z } from "zod";

// Hosting dashboards and local .env files commonly expose unset optional values
// as empty strings. Normalize those to undefined before validating optional config.
const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);
const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);
const mongoUri = z.string().url("MongoDB URI must be a valid URL").startsWith("mongodb");
const optionalMongoUri = z.preprocess(
  (value) => (value === "" ? undefined : value),
  mongoUri.optional(),
);
const optionalFlag = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.enum(["true", "false"]).optional().transform((value) => value === "true"),
);
const optionalInteger = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().min(min).max(max).optional(),
  );

const serverEnvSchema = z.object({
  MONGODB_URI: mongoUri.optional(),
  MONGODB_DB: z.string().min(1).default("freelanceflow"),
  TEST_MONGODB_URI: optionalMongoUri,
  TEST_MONGODB_DB: optionalString,
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  TRUST_PROXY_HOPS: optionalInteger(0, 10).default(0),
  TRUSTED_PROXY_IPS: optionalString,
  EMAIL_PROVIDER: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["emailjs", "test"]).optional().default("emailjs"),
  ),
  EMAIL_FROM: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().email().optional(),
  ),
  APP_BASE_URL: optionalUrl,
  EMAILJS_SERVICE_ID: optionalString,
  EMAILJS_TEMPLATE_ID_PASSWORD_RESET: optionalString,
  EMAILJS_PUBLIC_KEY: optionalString,
  EMAILJS_PRIVATE_KEY: optionalString,
  EMAILJS_TIMEOUT_MS: optionalInteger(1000, 30_000).default(8_000),
  ALLOW_EMAILJS_TEST_SEND: optionalFlag,
  ALLOW_DEV_RESET_LINK: optionalFlag,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error("Server environment configuration is invalid. Check .env.example.");
  }
  if (
    !result.data.MONGODB_URI &&
    !(process.env.NODE_ENV === "test" && result.data.TEST_MONGODB_URI)
  ) {
    throw new Error("Set MONGODB_URI, or TEST_MONGODB_URI in the test environment.");
  }
  return result.data;
}

export function trustedOrigins(): string[] {
  const configured = [
    process.env.APP_BASE_URL,
    process.env.BETTER_AUTH_URL,
    process.env.BETTER_AUTH_TRUSTED_ORIGINS,
  ]
    .filter(Boolean)
    .join(",");

  const origins = configured
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(origins));
}
