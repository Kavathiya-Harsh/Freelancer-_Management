import { afterEach, describe, expect, it } from "vitest";
import { getTrustedClientIp } from "@/server/security/rate-limit";
import { getAppBaseUrl, getEmailJsConfig } from "@/server/email/emailjs";
import { passwordValidationMessage } from "@/validations/password";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("trusted client IP resolution", () => {
  const request = new Request("http://localhost/api/auth/forgot-password", {
    headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
  });

  it("never trusts forwarded headers without proxy configuration", () => {
    delete process.env.TRUST_PROXY_HOPS;
    delete process.env.TRUSTED_PROXY_IPS;
    expect(getTrustedClientIp(request)).toBeNull();
  });

  it("uses the configured number of trusted hops", () => {
    process.env.TRUST_PROXY_HOPS = "1";
    expect(getTrustedClientIp(request)).toBe("10.0.0.1");
  });

  it("skips explicitly trusted proxy IPs", () => {
    process.env.TRUST_PROXY_HOPS = "0";
    process.env.TRUSTED_PROXY_IPS = "10.0.0.1";
    expect(getTrustedClientIp(request)).toBe("203.0.113.5");
  });
});

describe("EmailJS configuration hardening", () => {
  it("rejects placeholder credentials", () => {
    process.env.EMAILJS_SERVICE_ID = "your_emailjs_service_id";
    process.env.EMAILJS_TEMPLATE_ID_PASSWORD_RESET = "template_placeholder";
    process.env.EMAILJS_PUBLIC_KEY = "your_emailjs_public_key";
    process.env.EMAILJS_PRIVATE_KEY = "your_emailjs_private_key";
    expect(getEmailJsConfig()).toBeNull();
  });

  it("requires an explicit base URL in production", () => {
    delete process.env.APP_BASE_URL;
    delete process.env.BETTER_AUTH_URL;
    delete process.env.AUTH_BASE_URL;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    expect(() => getAppBaseUrl()).toThrow("APP_BASE_URL");
  });
});

describe("shared password validation", () => {
  it("matches the server password policy", () => {
    expect(passwordValidationMessage("ValidPass1234!")).toBeUndefined();
    expect(passwordValidationMessage("short")).toContain("12 and 128");
    expect(passwordValidationMessage("lowercase1234!")).toContain("uppercase");
    expect(passwordValidationMessage("UPPERCASE1234!")).toContain("lowercase");
    expect(passwordValidationMessage("NoNumbersHere!")).toContain("number");
    expect(passwordValidationMessage("NoSymbols12345")).toContain("symbol");
  });
});
