import "server-only";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";

export type EmailJsConfig = {
  serviceId: string;
  templateId: string;
  publicKey: string;
  privateKey: string;
};

export type PasswordResetEmailParams = {
  toEmail: string;
  toName?: string;
  resetUrl: string;
  expiresMinutes?: number;
  productName?: string;
  supportEmail?: string;
};

export type EmailDeliveryResult = {
  success: boolean;
  status?: number;
  error?: string;
  method?: "test" | "dev-outbox" | "emailjs";
};

export type EmailJsConfigStatus = {
  configured: boolean;
  missing: Array<"EMAILJS_SERVICE_ID" | "EMAILJS_TEMPLATE_ID_PASSWORD_RESET" | "EMAILJS_PUBLIC_KEY" | "EMAILJS_PRIVATE_KEY">;
};

const REQUIRED_EMAILJS_VARS = [
  "EMAILJS_SERVICE_ID",
  "EMAILJS_TEMPLATE_ID_PASSWORD_RESET",
  "EMAILJS_PUBLIC_KEY",
  "EMAILJS_PRIVATE_KEY",
] as const;

const EMAILJS_API_URL = "https://api.emailjs.com/api/v1.0/email/send";
const PLACEHOLDER_PATTERN = /your_|placeholder|example|xxx|replace|changeme/i;

type TestOutbox = typeof globalThis & {
  __freelanceFlowTestEmails?: Array<{ to: string; subject: string; text: string }>;
};

function isUsableValue(value: string | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && !PLACEHOLDER_PATTERN.test(trimmed);
}

/**
 * Validates and retrieves server-side EmailJS configuration.
 * Returns null if any required variable is missing or is an obvious placeholder.
 * Never logs or exposes private credentials.
 */
export function getEmailJsConfig(): EmailJsConfig | null {
  const serviceId = process.env.EMAILJS_SERVICE_ID?.trim();
  const templateId = process.env.EMAILJS_TEMPLATE_ID_PASSWORD_RESET?.trim();
  const publicKey = process.env.EMAILJS_PUBLIC_KEY?.trim();
  const privateKey = process.env.EMAILJS_PRIVATE_KEY?.trim();

  if (![serviceId, templateId, publicKey, privateKey].every(isUsableValue)) {
    return null;
  }

  return {
    serviceId: serviceId as string,
    templateId: templateId as string,
    publicKey: publicKey as string,
    privateKey: privateKey as string,
  };
}

/**
 * Reports which EmailJS variables are missing or placeholder values.
 * Variable names only — no values are ever returned or logged.
 */
export function getEmailJsConfigStatus(): EmailJsConfigStatus {
  if (process.env.NODE_ENV === "test") {
    return { configured: true, missing: [] };
  }
  const missing = REQUIRED_EMAILJS_VARS.filter(
    (name) => !isUsableValue(process.env[name]),
  );
  return { configured: missing.length === 0, missing: [...missing] };
}

/** True when a real message can be produced in the current environment. */
export function isPasswordResetEmailConfigured(): boolean {
  if (process.env.NODE_ENV === "test") return true;
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEV_RESET_LINK === "true"
  ) {
    return true;
  }
  return getEmailJsConfigStatus().configured;
}

export const DEV_RESET_LINK_FILE = ".dev-reset-links.jsonl";

/**
 * Development-only reset link capture. It is a hard no-op in production and
 * requires an explicit opt-in, so it can never leak real tokens in deployed
 * environments. The file is gitignored.
 */
async function captureDevResetLink(
  params: PasswordResetEmailParams,
): Promise<boolean> {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.ALLOW_DEV_RESET_LINK !== "true") return false;

  try {
    const record = {
      to: params.toEmail,
      resetUrl: params.resetUrl,
      expiresMinutes: params.expiresMinutes ?? 20,
      createdAt: new Date().toISOString(),
    };
    await appendFile(join(process.cwd(), DEV_RESET_LINK_FILE), `${JSON.stringify(record)}\n`, "utf8");
    return true;
  } catch {
    console.error("[EmailJS] Dev outbox could not be written.");
    return false;
  }
}

/**
 * Returns the trusted application base URL for constructing recovery links.
 * Never trusts arbitrary client-supplied Host headers and never falls back to
 * localhost in production.
 */
export function getAppBaseUrl(): string {
  const configured =
    process.env.APP_BASE_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.AUTH_BASE_URL?.trim();

  if (configured) {
    let url: URL;
    try {
      url = new URL(configured);
    } catch {
      throw new Error("APP_BASE_URL must be a valid absolute URL.");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("APP_BASE_URL must use http or https.");
    }
    if (url.username || url.password) {
      throw new Error("APP_BASE_URL must not contain credentials.");
    }
    return configured.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_BASE_URL must be configured in production.");
  }

  return "http://localhost:3000";
}

function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === "test";
}

/**
 * Sends a password reset email through the EmailJS server-side API.
 * The request is abortable and provider errors are sanitized before logging.
 */
export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams,
): Promise<EmailDeliveryResult> {
  if (isTestEnvironment()) {
    const globalForTest = globalThis as TestOutbox;
    globalForTest.__freelanceFlowTestEmails ??= [];
    globalForTest.__freelanceFlowTestEmails.push({
      to: params.toEmail,
      subject: "Reset your FreelanceFlow password",
      text: `Password reset link requested. Expiration: ${params.expiresMinutes ?? 20}m`,
    });
    return { success: true, status: 200, method: "test" };
  }

  // If EmailJS is configured, prioritize sending a real email
  const config = getEmailJsConfig();
  if (config) {
    const toName = params.toName || params.toEmail.split("@")[0];
    const productName = params.productName || "FreelanceFlow";
    const supportEmail = params.supportEmail || "support@freelanceflow.dev";
    const expiresMinutes = params.expiresMinutes ?? 20;

    const templateParams = {
      to_email: params.toEmail,
      email: params.toEmail,
      user_email: params.toEmail,
      recipient: params.toEmail,
      recipient_email: params.toEmail,
      to_name: toName,
      name: toName,
      user_name: toName,
      product_name: productName,
      reset_url: params.resetUrl,
      reset_link: params.resetUrl,
      link: params.resetUrl,
      url: params.resetUrl,
      expires_minutes: expiresMinutes,
      expiry_time: `${expiresMinutes} minutes`,
      support_email: supportEmail,
      from_name: productName,
      reply_to: supportEmail,
      subject: `Reset your ${productName} password`,
    };

    const parsedTimeout = Number.parseInt(process.env.EMAILJS_TIMEOUT_MS ?? "8000", 10);
    const timeoutMs = Number.isFinite(parsedTimeout) ? parsedTimeout : 8_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const appUrl = getAppBaseUrl();
      const response = await fetch(EMAILJS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: appUrl,
        },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          user_id: config.publicKey,
          accessToken: config.privateKey,
          service_id: config.serviceId,
          template_id: config.templateId,
          template_params: templateParams,
        }),
      });

      const body = await response.text();

      if (response.ok && !/^\s*(fail|error)\b/i.test(body)) {
        console.info(`[EmailJS] Password reset email sent successfully to ${params.toEmail}.`);
        await captureDevResetLink(params);
        return { success: true, status: response.status, method: "emailjs" };
      }

      console.warn(`[EmailJS] Provider send rejected (status ${response.status}): ${body}`);
    } catch (err) {
      const code = controller.signal.aborted ? "EMAILJS_TIMEOUT" : "EMAILJS_SEND_FAILED";
      console.error(`[EmailJS] Delivery failed: ${code}`, err instanceof Error ? err.message : "");
    } finally {
      clearTimeout(timer);
    }
  }

  // Fallback to development outbox when EmailJS is not configured or in local development
  if (await captureDevResetLink(params)) {
    console.log("\n==================================================================");
    console.log("🔗 [DEV OUTBOX] PASSWORD RESET LINK GENERATED");
    console.log(`📧 Recipient: ${params.toEmail}`);
    console.log(`🔗 Reset URL:  ${params.resetUrl}`);
    console.log(`⏱️  Expires:    ${params.expiresMinutes ?? 20} minutes`);
    console.log(`📁 Captured:   .dev-reset-links.jsonl`);
    console.log("==================================================================\n");
    return { success: true, status: 200, method: "dev-outbox" };
  }

  const status = getEmailJsConfigStatus();
  console.warn("[EmailJS] Service unconfigured. Missing:", status.missing.join(", "));
  return { success: false, error: "EMAILJS_NOT_CONFIGURED" };
}
