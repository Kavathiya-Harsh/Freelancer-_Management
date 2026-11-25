import { afterEach, describe, expect, it } from "vitest";
import { getServerEnv } from "@/server/env";
import {
  getEmailJsConfigStatus,
  isPasswordResetEmailConfigured,
} from "@/server/email/emailjs";
import {
  enforceRateLimit,
  getRateLimitFingerprint,
  RateLimitError,
} from "@/server/security/rate-limit";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("recovery configuration", () => {
  it("accepts the example file's ALLOW_EMAILJS_TEST_SEND=false value", () => {
    process.env.BETTER_AUTH_SECRET = "x".repeat(32);
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.MONGODB_URI = "mongodb://localhost:27017/freelanceflow";
    process.env.ALLOW_EMAILJS_TEST_SEND = "false";

    expect(() => getServerEnv()).not.toThrow();
  });

  it("uses the test transport without EmailJS credentials under NODE_ENV=test", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    expect(isPasswordResetEmailConfigured()).toBe(true);
    expect(getEmailJsConfigStatus().missing).toEqual([]);
  });
});

describe("rate limit fallback", () => {
  it("generates a stable non-identifying fingerprint", () => {
    const first = new Request("http://localhost/api", {
      headers: { "user-agent": "browser-a", "accept-language": "en" },
    });
    const second = new Request("http://localhost/api", {
      headers: { "user-agent": "browser-a", "accept-language": "en" },
    });
    const third = new Request("http://localhost/api", {
      headers: { "user-agent": "browser-b", "accept-language": "en" },
    });

    expect(getRateLimitFingerprint(first)).toBe(getRateLimitFingerprint(second));
    expect(getRateLimitFingerprint(first)).not.toBe(getRateLimitFingerprint(third));
  });

  it("limits in-process when Upstash is not configured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const key = `fallback-${Date.now()}`;
    for (let index = 0; index < 30; index += 1) {
      await expect(enforceRateLimit("unit", key)).resolves.toBeUndefined();
    }
    await expect(enforceRateLimit("unit", key)).rejects.toBeInstanceOf(RateLimitError);
  });
});
