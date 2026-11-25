import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  resetPasswordWithToken: vi.fn(),
  hashResetToken: vi.fn(() => "hashed-token"),
  enforceRateLimit: vi.fn(),
  getTrustedClientIp: vi.fn(() => null),
}));

vi.mock("@/server/auth/password-reset", async () => {
  const actual = await vi.importActual<typeof import("@/server/auth/password-reset")>(
    "@/server/auth/password-reset",
  );
  return {
    ...actual,
    requestPasswordReset: mocks.requestPasswordReset,
    resetPasswordWithToken: mocks.resetPasswordWithToken,
    hashResetToken: mocks.hashResetToken,
  };
});

vi.mock("@/server/security/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/server/security/rate-limit")>(
    "@/server/security/rate-limit",
  );
  return {
    ...actual,
    enforceRateLimit: mocks.enforceRateLimit,
    getTrustedClientIp: mocks.getTrustedClientIp,
  };
});

import { POST as forgotPasswordPost } from "@/app/api/auth/forgot-password/route";
import { POST as resetPasswordPost } from "@/app/api/auth/reset-password/route";
import { RateLimitError } from "@/server/security/rate-limit";

const originalEnv = { ...process.env };

function jsonRequest(path: string, body: unknown, origin = "http://localhost:3000") {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.APP_BASE_URL = "http://localhost:3000";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  delete process.env.TRUST_PROXY_HOPS;
  delete process.env.TRUSTED_PROXY_IPS;
  mocks.hashResetToken.mockReturnValue("hashed-token");
  mocks.getTrustedClientIp.mockReturnValue(null);
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("forgot-password route hardening", () => {
  it("returns a generic response with no token material", async () => {
    mocks.requestPasswordReset.mockResolvedValue({
      success: true,
      message:
        "If an account exists for this email, a password recovery link will be sent.",
      emailDelivery: { success: false, error: "EMAILJS_NOT_CONFIGURED" },
    });

    const response = await forgotPasswordPost(
      jsonRequest("/api/auth/forgot-password", { email: " User@Example.com " }),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body.message).toContain("If an account exists");
    expect(body).not.toHaveProperty("debugToken");
    expect(body).not.toHaveProperty("devResetUrl");
    expect(body).not.toHaveProperty("resetUrl");
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(
      "forgot-password",
      "email:user@example.com",
    );
  });

  it("rejects untrusted origins before doing any work", async () => {
    const response = await forgotPasswordPost(
      jsonRequest(
        "/api/auth/forgot-password",
        { email: "user@example.com" },
        "https://evil.example",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_REQUEST");
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();
  });

  it("maps rate limiting to a 429", async () => {
    mocks.enforceRateLimit.mockRejectedValueOnce(new RateLimitError("RATE_LIMITED"));

    const response = await forgotPasswordPost(
      jsonRequest("/api/auth/forgot-password", { email: "user@example.com" }),
    );

    expect(response.status).toBe(429);
  });
});

describe("reset-password route hardening", () => {
  const validBody = {
    token: "raw-token-123",
    password: "ValidPass1234!",
    confirmPassword: "ValidPass1234!",
  };

  it("accepts a valid reset and never echoes the token", async () => {
    mocks.resetPasswordWithToken.mockResolvedValue({
      success: true,
      message: "Password updated successfully. You can now sign in.",
    });

    const response = await resetPasswordPost(
      jsonRequest("/api/auth/reset-password", validBody),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain("Password updated");
    expect(JSON.stringify(body)).not.toContain("raw-token-123");
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(
      "reset-password",
      "token:hashed-token",
    );
  });

  it("rejects malformed payloads", async () => {
    const response = await resetPasswordPost(
      jsonRequest("/api/auth/reset-password", { ...validBody, password: "weak" }),
    );

    expect(response.status).toBe(400);
    expect(mocks.resetPasswordWithToken).not.toHaveBeenCalled();
  });
});
