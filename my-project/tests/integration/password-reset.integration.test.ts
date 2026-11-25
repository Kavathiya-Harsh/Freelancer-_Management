import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { MongoClient, ObjectId } from "mongodb";
import {
  requestPasswordReset,
  resetPasswordWithToken,
  hashResetToken,
  getTestPasswordResetTokens,
} from "../../src/server/auth/password-reset";

const testDbUri = process.env.TEST_MONGODB_URI;
const testDbName = process.env.TEST_MONGODB_DB;
const hasDisposableDbName = Boolean(
  testDbName && /(test|dev|demo|sandbox)/i.test(testDbName),
);

describe.skipIf(!testDbUri || !hasDisposableDbName)(
  "Password reset integration tests",
  () => {
    let client: MongoClient;
    const testEmail = "test-reset-user@example.test";
    const testUserId = new ObjectId();

    function latestRawToken(): string {
      const token = getTestPasswordResetTokens().at(-1)?.rawToken;
      if (!token) throw new Error("No test reset token was recorded.");
      return token;
    }

    beforeAll(async () => {
      process.env.EMAIL_PROVIDER = "test";
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      getTestPasswordResetTokens().length = 0;

      client = new MongoClient(testDbUri!);
      await client.connect();
      const db = client.db(testDbName!);

      await db.collection("user").deleteOne({ _id: testUserId });
      await db.collection("account").deleteMany({ userId: testUserId });
      await db.collection("session").deleteMany({ userId: testUserId });
      await db.collection("users").deleteOne({ _id: testUserId });
      await db.collection("authSessions").deleteMany({ userId: testUserId });
      await db.collection("authRefreshTokens").deleteMany({ userId: testUserId });
      await db.collection("passwordResetTokens").deleteMany({ email: testEmail });

      await db.collection("user").insertOne({
        _id: testUserId,
        name: "Integration Test User",
        email: testEmail,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.collection("account").insertOne({
        providerId: "credential",
        userId: testUserId,
        password: "initial-password-hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.collection("session").insertOne({
        userId: testUserId,
        token: "test-active-session-token",
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    afterAll(async () => {
      if (!client) return;
      const db = client.db(testDbName!);
      await db.collection("user").deleteOne({ _id: testUserId });
      await db.collection("account").deleteMany({ userId: testUserId });
      await db.collection("session").deleteMany({ userId: testUserId });
      await db.collection("users").deleteOne({ _id: testUserId });
      await db.collection("authSessions").deleteMany({ userId: testUserId });
      await db.collection("authRefreshTokens").deleteMany({ userId: testUserId });
      await db.collection("passwordResetTokens").deleteMany({ email: testEmail });
      await client.close();
    });

    it("returns an identical generic response for an unknown email", async () => {
      const before = getTestPasswordResetTokens().length;
      const response = await requestPasswordReset("nonexistent-random-user@example.test");
      expect(response.success).toBe(true);
      expect(response.message).toContain("If an account exists");
      expect(response).not.toHaveProperty("debugToken");
      expect(response).not.toHaveProperty("resetUrl");
      expect(getTestPasswordResetTokens()).toHaveLength(before);
    });

    it("stores only a hash for an existing user", async () => {
      const response = await requestPasswordReset(testEmail);
      expect(response.message).toContain("If an account exists");
      expect(response).not.toHaveProperty("debugToken");

      const rawToken = latestRawToken();
      const expectedHash = hashResetToken(rawToken);
      const db = client.db(testDbName!);
      const tokenRecord = await db
        .collection("passwordResetTokens")
        .findOne({ tokenHash: expectedHash });

      expect(tokenRecord).not.toBeNull();
      expect(tokenRecord!.consumedAt).toBeNull();
      expect(tokenRecord!.revokedAt).toBeNull();
      expect(tokenRecord).not.toHaveProperty("rawToken");
      expect(tokenRecord).not.toHaveProperty("token");
    });

    it("rejects mismatched passwords", async () => {
      await expect(
        resetPasswordWithToken({
          token: "any-token",
          password: "NewPassword1234!",
          confirmPassword: "MismatchedPassword1234!",
        }),
      ).rejects.toThrow("PASSWORDS_DO_NOT_MATCH");
    });

    it("rejects weak passwords", async () => {
      await expect(
        resetPasswordWithToken({
          token: "any-token",
          password: "short",
          confirmPassword: "short",
        }),
      ).rejects.toThrow();
    });

    it("rejects fabricated tokens", async () => {
      await expect(
        resetPasswordWithToken({
          token: "invalid-fabricated-token-12345",
          password: "ValidNewPassword1234!",
          confirmPassword: "ValidNewPassword1234!",
        }),
      ).rejects.toThrow("INVALID_OR_EXPIRED_TOKEN");
    });

    it("resets the password atomically, revokes sessions and enforces single use", async () => {
      await requestPasswordReset(testEmail);
      const rawToken = latestRawToken();

      const result = await resetPasswordWithToken({
        token: rawToken,
        password: "BrandNewPassword1234!",
        confirmPassword: "BrandNewPassword1234!",
      });

      expect(result.success).toBe(true);
      const db = client.db(testDbName!);

      const tokenRecord = await db
        .collection("passwordResetTokens")
        .findOne({ tokenHash: hashResetToken(rawToken) });
      expect(tokenRecord!.consumedAt).not.toBeNull();

      const account = await db
        .collection("account")
        .findOne({ userId: testUserId, providerId: "credential" });
      expect(account!.password).not.toBe("initial-password-hash");

      const activeSessions = await db
        .collection("session")
        .find({ userId: testUserId })
        .toArray();
      expect(activeSessions).toHaveLength(0);

      await expect(
        resetPasswordWithToken({
          token: rawToken,
          password: "AnotherNewPassword1234!",
          confirmPassword: "AnotherNewPassword1234!",
        }),
      ).rejects.toThrow("INVALID_OR_EXPIRED_TOKEN");
    });

    it("rejects expired tokens", async () => {
      await requestPasswordReset(testEmail);
      const rawToken = latestRawToken();
      const db = client.db(testDbName!);

      await db
        .collection("passwordResetTokens")
        .updateOne(
          { tokenHash: hashResetToken(rawToken) },
          { $set: { expiresAt: new Date(Date.now() - 60_000) } },
        );

      await expect(
        resetPasswordWithToken({
          token: rawToken,
          password: "ExpiredPassword1234!",
          confirmPassword: "ExpiredPassword1234!",
        }),
      ).rejects.toThrow("INVALID_OR_EXPIRED_TOKEN");
    });
  },
);
