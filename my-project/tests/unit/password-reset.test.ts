import { describe, expect, it } from "vitest";
import {
  generateResetToken,
  hashResetToken,
} from "../../src/server/auth/password-reset";
import {
  emailSchema,
  passwordSchema,
  normalizeEmail,
} from "../../src/server/auth/validation";
import {
  getEmailJsConfig,
  getAppBaseUrl,
} from "../../src/server/email/emailjs";

describe("Password reset token utilities", () => {
  it("generates a random token and a deterministic sha256 hash", () => {
    const { rawToken, tokenHash } = generateResetToken();

    expect(typeof rawToken).toBe("string");
    expect(rawToken.length).toBeGreaterThanOrEqual(40);
    expect(typeof tokenHash).toBe("string");
    expect(tokenHash).toBe(hashResetToken(rawToken));
  });

  it("produces distinct raw tokens on each generation", () => {
    const t1 = generateResetToken();
    const t2 = generateResetToken();

    expect(t1.rawToken).not.toBe(t2.rawToken);
    expect(t1.tokenHash).not.toBe(t2.tokenHash);
  });

  it("normalizes email addresses consistently", () => {
    expect(normalizeEmail("  USER@Example.COM  ")).toBe("user@example.com");
    expect(emailSchema.parse("  Developer@FreelanceFlow.dev  ")).toBe(
      "developer@freelanceflow.dev",
    );
  });

  it("validates password complexity requirements", () => {
    // Valid password (>= 12 chars, lower, upper, digit, symbol)
    expect(() => passwordSchema.parse("ValidPass1234!")).not.toThrow();

    // Too short (< 12)
    expect(() => passwordSchema.parse("Short1!")).toThrow();

    // Missing uppercase
    expect(() => passwordSchema.parse("lowercase1234!")).toThrow();

    // Missing lowercase
    expect(() => passwordSchema.parse("UPPERCASE1234!")).toThrow();

    // Missing number
    expect(() => passwordSchema.parse("NoNumbersHere!")).toThrow();

    // Missing symbol
    expect(() => passwordSchema.parse("NoSymbols12345")).toThrow();
  });
});

describe("EmailJS configuration and URL utilities", () => {
  it("returns null when EmailJS variables are missing", () => {
    const originalEnv = { ...process.env };
    delete process.env.EMAILJS_SERVICE_ID;
    delete process.env.EMAILJS_TEMPLATE_ID_PASSWORD_RESET;
    delete process.env.EMAILJS_PUBLIC_KEY;
    delete process.env.EMAILJS_PRIVATE_KEY;

    expect(getEmailJsConfig()).toBeNull();

    // Restore
    process.env = originalEnv;
  });

  it("constructs application base URL cleanly without trailing slash", () => {
    process.env.APP_BASE_URL = "https://app.freelanceflow.test///";
    expect(getAppBaseUrl()).toBe("https://app.freelanceflow.test");
  });
});