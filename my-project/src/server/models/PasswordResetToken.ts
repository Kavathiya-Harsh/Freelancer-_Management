import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const passwordResetTokenSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, immutable: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    tokenHash: { type: String, required: true, immutable: true, unique: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    deliveryStatus: {
      type: String,
      enum: ["pending", "sent", "failed", "skipped"],
      default: "pending",
    },
  },
  { timestamps: true, collection: "passwordResetTokens" },
);

// TTL index for eventual cleanup of old records (7 days after expiration)
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 604800 });
passwordResetTokenSchema.index({ userId: 1, consumedAt: 1, revokedAt: 1 });

export type PasswordResetToken = InferSchemaType<typeof passwordResetTokenSchema> & {
  _id: string;
};

export const PasswordResetTokenModel: Model<PasswordResetToken> =
  (models.PasswordResetToken as Model<PasswordResetToken>) ??
  model<PasswordResetToken>("PasswordResetToken", passwordResetTokenSchema);
