import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  InvalidAccessTokenError,
  signAccessToken,
  verifyAccessToken,
} from "../../src/server/auth/jwt";
import { hashPassword, verifyPassword } from "../../src/server/auth/password";
import { createRefreshToken, hashOpaqueToken } from "../../src/server/auth/refresh-token";
import { passwordSchema } from "../../src/server/auth/validation";

const jwtEnvKeys = [
  "JWT_ACCESS_SECRET",
  "JWT_ISSUER",
  "JWT_AUDIENCE",
  "AUTH_ACCESS_TOKEN_TTL",
] as const;
const savedEnv = new Map(jwtEnvKeys.map((key) => [key, process.env[key]]));

beforeEach(() => {
  process.env.JWT_ACCESS_SECRET = randomBytes(32).toString("base64url");
  process.env.JWT_ISSUER = "https://auth.example.test";
  process.env.JWT_AUDIENCE = "freelanceflow";
  process.env.AUTH_ACCESS_TOKEN_TTL = "600";
});

afterEach(() => {
  for (const key of jwtEnvKeys) {
    const value = savedEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.useRealTimers();
});

describe("password policy and hashing", () => {
  it("requires a long password with mixed character classes", () => {
    expect(passwordSchema.safeParse("StrongPassword9!").success).toBe(true);
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercasepassword9!").success).toBe(false);
  });

  it("uses Argon2id and verifies only the matching password", async () => {
    const password = "StrongPassword9!";
    const hash = await hashPassword(password);

    expect(hash.startsWith("$argon2id$")).toBe(true);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("DifferentPassword9!", hash)).resolves.toBe(false);
    await expect(verifyPassword(password, "legacy-hash")).resolves.toBe(false);
  });
});

describe("JWT access tokens", () => {
  it("signs and verifies short-lived tokens with user and session claims", async () => {
    const token = await signAccessToken({ userId: "user-1", sessionId: "session-1" });

    await expect(verifyAccessToken(token)).resolves.toMatchObject({
      userId: "user-1",
      sessionId: "session-1",
    });
  });

  it("rejects a token with the wrong audience", async () => {
    const token = await signAccessToken({ userId: "user-1", sessionId: "session-1" });
    process.env.JWT_AUDIENCE = "another-service";

    await expect(verifyAccessToken(token)).rejects.toBeInstanceOf(
      InvalidAccessTokenError,
    );
  });

  it("rejects expired tokens", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const token = await signAccessToken({ userId: "user-1", sessionId: "session-1" });
    vi.setSystemTime(new Date("2026-01-01T00:11:00.000Z"));

    await expect(verifyAccessToken(token)).rejects.toBeInstanceOf(
      InvalidAccessTokenError,
    );
  });

  it("rejects a modified token", async () => {
    const token = await signAccessToken({ userId: "user-1", sessionId: "session-1" });
    const [header, payload, signature] = token.split(".");
    const mutatedPayload = `${payload.slice(0, 4)}${payload[4] === "A" ? "B" : "A"}${payload.slice(5)}`;

    await expect(
      verifyAccessToken(`${header}.${mutatedPayload}.${signature}`),
    ).rejects.toBeInstanceOf(InvalidAccessTokenError);
  });
});

describe("opaque refresh tokens", () => {
  it("generates random opaque values and stores only deterministic hashes", () => {
    const token = createRefreshToken();
    const hash = hashOpaqueToken(token);

    expect(token).not.toBe(hash);
    expect(hashOpaqueToken(token)).toBe(hash);
    expect(createRefreshToken()).not.toBe(token);
  });
});
