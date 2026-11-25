import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { ObjectId, type Db } from "mongodb";
import { getMongoClient, getMongoDb } from "@/server/db/mongo-client";
import { passwordSchema, normalizeEmail } from "./validation";
import { hashPassword as hashArgon2 } from "./password";
import {
  sendPasswordResetEmail,
  getAppBaseUrl,
  type EmailDeliveryResult,
} from "@/server/email/emailjs";

const TOKEN_EXPIRATION_MINUTES = 20;
const TOKEN_COLLECTION = "passwordResetTokens";

type PasswordResetTokenDocument = {
  _id: string;
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
  deliveryStatus: "pending" | "sent" | "failed";
  createdAt: Date;
  updatedAt: Date;
};

type PasswordResetRequestResult = {
  success: true;
  message: string;
  emailDelivery?: EmailDeliveryResult;
};

type ResetTestOutbox = typeof globalThis & {
  __freelanceFlowPasswordResetTokens?: Array<{
    userId: string;
    email: string;
    rawToken: string;
    tokenHash: string;
    expiresAt: Date;
  }>;
};

export class InvalidOrExpiredResetTokenError extends Error {
  constructor() {
    super("INVALID_OR_EXPIRED_TOKEN");
    this.name = "InvalidOrExpiredResetTokenError";
  }
}

export class PasswordMismatchError extends Error {
  constructor() {
    super("PASSWORDS_DO_NOT_MATCH");
    this.name = "PasswordMismatchError";
  }
}

export class PasswordResetUnavailableError extends Error {
  readonly code:
    "PASSWORD_RESET_TRANSACTION_UNAVAILABLE" | "PASSWORD_HASHING_UNAVAILABLE";

  constructor(code: PasswordResetUnavailableError["code"]) {
    super(code);
    this.name = "PasswordResetUnavailableError";
    this.code = code;
  }
}

const indexPromises = new WeakMap<Db, Promise<void>>();

async function ensurePasswordResetTokenIndexes(db: Db): Promise<void> {
  const existing = indexPromises.get(db);
  if (existing) return existing;

  const pending = (async () => {
    const collection = db.collection(TOKEN_COLLECTION);
    const indexes = await collection.indexes();

    const hasIndexOn = (keys: Record<string, 1>): boolean =>
      indexes.some((index) => {
        const key = index.key;
        if (typeof key !== "object" || key === null) return false;
        const fields = Object.keys(key);
        return (
          fields.length === Object.keys(keys).length &&
          Object.entries(keys).every(
            ([field, direction]) => Number((key as Record<string, unknown>)[field]) === direction,
          )
        );
      });

    if (!hasIndexOn({ tokenHash: 1 })) {
      await collection.createIndex(
        { tokenHash: 1 },
        { name: "ux_passwordResetTokens_tokenHash", unique: true },
      );
    }
    if (!hasIndexOn({ userId: 1, consumedAt: 1, revokedAt: 1 })) {
      await collection.createIndex(
        { userId: 1, consumedAt: 1, revokedAt: 1 },
        { name: "ix_passwordResetTokens_user_active" },
      );
    }
    if (!hasIndexOn({ expiresAt: 1 })) {
      await collection.createIndex(
        { expiresAt: 1 },
        { name: "ttl_passwordResetTokens_expiresAt", expireAfterSeconds: 604_800 },
      );
    }
  })().catch((error: unknown) => {
    indexPromises.delete(db);
    throw error;
  });

  indexPromises.set(db, pending);
  return pending;
}

/** Test-only accessor. Never available outside NODE_ENV=test. */
export function getTestPasswordResetTokens(): Array<{
  userId: string;
  email: string;
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Password reset test outbox is only available in tests.");
  }
  const globalForTest = globalThis as ResetTestOutbox;
  return globalForTest.__freelanceFlowPasswordResetTokens ?? [];
}

export function generateResetToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(rawToken);
  return { rawToken, tokenHash };
}

export function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export async function requestPasswordReset(
  email: string,
): Promise<PasswordResetRequestResult> {
  const db = await getMongoDb();
  await ensurePasswordResetTokenIndexes(db);

  const normalized = normalizeEmail(email);
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const caseInsensitiveQuery = { email: { $regex: new RegExp(`^${escaped}$`, "i") } };

  const user =
    (await db.collection("user").findOne({ email: normalized })) ||
    (await db.collection("user").findOne(caseInsensitiveQuery)) ||
    (await db.collection("users").findOne({ normalizedEmail: normalized })) ||
    (await db.collection("users").findOne(caseInsensitiveQuery));

  const genericMessage =
    "If an account exists for this email, a password recovery link will be sent.";

  if (!user) return { success: true, message: genericMessage };

  const userId = (user._id?.toString() || (user as { id?: string }).id) as string;
  const userName = (user as { name?: string }).name || normalized.split("@")[0];

  const tokenColl = db.collection<PasswordResetTokenDocument>(TOKEN_COLLECTION);

  const { rawToken, tokenHash } = generateResetToken();
  const tokenId = randomUUID();
  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() + TOKEN_EXPIRATION_MINUTES * 60 * 1000,
  );

  await tokenColl.insertOne({
    _id: tokenId,
    userId,
    email: normalized,
    tokenHash,
    expiresAt,
    consumedAt: null,
    revokedAt: null,
    deliveryStatus: "pending",
    createdAt,
    updatedAt: createdAt,
  });

  if (process.env.NODE_ENV === "test") {
    const globalForTest = globalThis as ResetTestOutbox;
    globalForTest.__freelanceFlowPasswordResetTokens ??= [];
    globalForTest.__freelanceFlowPasswordResetTokens.push({
      userId,
      email: normalized,
      rawToken,
      tokenHash,
      expiresAt,
    });
  }

  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const delivery = await sendPasswordResetEmail({
    toEmail: normalized,
    toName: userName,
    resetUrl,
    expiresMinutes: TOKEN_EXPIRATION_MINUTES,
    productName: "FreelanceFlow",
  });

  const settledAt = new Date();
  if (delivery.success) {
    await tokenColl.updateMany(
      {
        userId,
        consumedAt: null,
        revokedAt: null,
        createdAt: { $lt: createdAt },
        _id: { $ne: tokenId },
      },
      { $set: { revokedAt: settledAt, updatedAt: settledAt } },
    );
  }

  await tokenColl.updateOne(
    { _id: tokenId },
    {
      $set: {
        deliveryStatus: delivery.success ? "sent" : "failed",
        ...(delivery.success ? {} : { revokedAt: settledAt }),
        updatedAt: settledAt,
      },
    },
  );

  return {
    success: true,
    message: genericMessage,
    emailDelivery: delivery,
  };
}

async function hashBetterAuthPassword(password: string): Promise<string> {
  try {
    const { hashPassword } = await import("@better-auth/utils/password");
    return await hashPassword(password);
  } catch {
    throw new PasswordResetUnavailableError("PASSWORD_HASHING_UNAVAILABLE");
  }
}

function userIdVariants(userId: string): Array<ObjectId | string> {
  const variants: Array<ObjectId | string> = [userId];
  if (ObjectId.isValid(userId)) variants.push(new ObjectId(userId));
  return variants;
}

function isTransactionUnsupported(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /Transaction numbers are only allowed|transaction.*replica set|transaction.*mongos|TransientTransactionError/i.test(
    error.message,
  );
}

export async function resetPasswordWithToken(input: {
  token: string;
  password: string;
  confirmPassword?: string;
}): Promise<{ success: true; message: string }> {
  const token = input.token?.trim();
  if (!token) throw new InvalidOrExpiredResetTokenError();
  if (input.confirmPassword !== undefined && input.password !== input.confirmPassword) {
    throw new PasswordMismatchError();
  }
  passwordSchema.parse(input.password);

  const tokenHash = hashResetToken(token);
  const db = await getMongoDb();

  const candidate = await db
    .collection<PasswordResetTokenDocument>(TOKEN_COLLECTION)
    .findOne({
      tokenHash,
      consumedAt: null,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
  if (!candidate) throw new InvalidOrExpiredResetTokenError();

  const [betterAuthHash, argon2Hash] = await Promise.all([
    hashBetterAuthPassword(input.password),
    hashArgon2(input.password),
  ]);

  const client = await getMongoClient();
  const session = client.startSession();

  let transactionFailedWithUnsupported = false;
  try {
    await session.withTransaction(
      async () => {
        const tokenRecord = await db
          .collection<PasswordResetTokenDocument>(TOKEN_COLLECTION)
          .findOneAndUpdate(
            {
              tokenHash,
              consumedAt: null,
              revokedAt: null,
              expiresAt: { $gt: new Date() },
            },
            { $set: { consumedAt: new Date(), updatedAt: new Date() } },
            { session, returnDocument: "before" },
          );

        if (!tokenRecord) throw new InvalidOrExpiredResetTokenError();

        const userId = tokenRecord.userId;
        const objectIdVariants = userIdVariants(userId);
        const stringVariants = Array.from(
          new Set([
            userId,
            ...objectIdVariants
              .filter((value): value is ObjectId => value instanceof ObjectId)
              .map((value) => value.toString()),
          ]),
        );
        const now = new Date();

        await db
          .collection<{
            userId: ObjectId | string;
            providerId?: string;
            password?: string;
            updatedAt?: Date;
          }>("account")
          .updateMany(
            { userId: { $in: objectIdVariants }, providerId: "credential" },
            { $set: { password: betterAuthHash, updatedAt: now } },
            { session },
          );

        await db
          .collection<{
            _id: ObjectId | string;
            passwordChangedAt?: Date;
            updatedAt?: Date;
          }>("user")
          .updateMany(
            { _id: { $in: objectIdVariants } },
            { $set: { passwordChangedAt: now, updatedAt: now } },
            { session },
          );

        await db
          .collection<{
            _id: ObjectId | string;
            passwordHash?: string;
            passwordChangedAt?: Date;
            passwordResetRequired?: boolean;
            updatedAt?: Date;
          }>("users")
          .updateMany(
            { _id: { $in: stringVariants } },
            {
              $set: {
                passwordHash: argon2Hash,
                passwordChangedAt: now,
                passwordResetRequired: false,
                updatedAt: now,
              },
            },
            { session },
          );

        await db
          .collection<{ userId: ObjectId | string }>("session")
          .deleteMany({ userId: { $in: objectIdVariants } }, { session });

        await db.collection("authSessions").updateMany(
          { userId: { $in: stringVariants }, status: "active" },
          {
            $set: {
              status: "revoked",
              revokedAt: now,
              revokeReason: "password-reset",
              updatedAt: now,
            },
          },
          { session },
        );

        await db
          .collection("authRefreshTokens")
          .updateMany(
            { userId: { $in: stringVariants }, revokedAt: null },
            { $set: { revokedAt: now } },
            { session },
          );
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      },
    );
  } catch (error) {
    if (error instanceof InvalidOrExpiredResetTokenError) throw error;
    if (isTransactionUnsupported(error)) {
      transactionFailedWithUnsupported = true;
    } else {
      throw error;
    }
  } finally {
    await session.endSession();
  }

  // Graceful standalone fallback when MongoDB instance is not in a replica set
  if (transactionFailedWithUnsupported) {
    const now = new Date();
    const tokenRecord = await db
      .collection<PasswordResetTokenDocument>(TOKEN_COLLECTION)
      .findOneAndUpdate(
        {
          tokenHash,
          consumedAt: null,
          revokedAt: null,
          expiresAt: { $gt: now },
        },
        { $set: { consumedAt: now, updatedAt: now } },
        { returnDocument: "before" },
      );

    if (!tokenRecord) throw new InvalidOrExpiredResetTokenError();

    const userId = tokenRecord.userId;
    const objectIdVariants = userIdVariants(userId);
    const stringVariants = Array.from(
      new Set([
        userId,
        ...objectIdVariants
          .filter((value): value is ObjectId => value instanceof ObjectId)
          .map((value) => value.toString()),
      ]),
    );

    await db
      .collection<{
        userId: ObjectId | string;
        providerId?: string;
        password?: string;
        updatedAt?: Date;
      }>("account")
      .updateMany(
        { userId: { $in: objectIdVariants }, providerId: "credential" },
        { $set: { password: betterAuthHash, updatedAt: now } },
      );

    await db
      .collection<{
        _id: ObjectId | string;
        passwordChangedAt?: Date;
        updatedAt?: Date;
      }>("user")
      .updateMany(
        { _id: { $in: objectIdVariants } },
        { $set: { passwordChangedAt: now, updatedAt: now } },
      );

    await db
      .collection<{
        _id: ObjectId | string;
        passwordHash?: string;
        passwordChangedAt?: Date;
        passwordResetRequired?: boolean;
        updatedAt?: Date;
      }>("users")
      .updateMany(
        { _id: { $in: stringVariants } },
        {
          $set: {
            passwordHash: argon2Hash,
            passwordChangedAt: now,
            passwordResetRequired: false,
            updatedAt: now,
          },
        },
      );

    await db
      .collection<{ userId: ObjectId | string }>("session")
      .deleteMany({ userId: { $in: objectIdVariants } });

    await db.collection("authSessions").updateMany(
      { userId: { $in: stringVariants }, status: "active" },
      {
        $set: {
          status: "revoked",
          revokedAt: now,
          revokeReason: "password-reset",
          updatedAt: now,
        },
      },
    );

    await db
      .collection("authRefreshTokens")
      .updateMany(
        { userId: { $in: stringVariants }, revokedAt: null },
        { $set: { revokedAt: now } },
      );
  }

  return {
    success: true,
    message: "Password updated successfully. You can now sign in.",
  };
}
