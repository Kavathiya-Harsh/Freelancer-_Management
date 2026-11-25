import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const authSessionSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, immutable: true },
    tokenFamilyId: { type: String, required: true, immutable: true },
    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
      required: true,
    },
    createdAt: { type: Date, required: true, default: Date.now, immutable: true },
    lastUsedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokeReason: {
      type: String,
      enum: ["logout", "logout-all", "password-change", "password-reset", "refresh-reuse"],
      default: null,
    },
    device: {
      label: { type: String, maxlength: 120 },
      userAgent: { type: String, maxlength: 512 },
    },
  },
  { timestamps: { createdAt: false, updatedAt: true }, collection: "authSessions" },
);

authSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });
authSessionSchema.index({ tokenFamilyId: 1, status: 1 });
authSessionSchema.index({ expiresAt: 1 });

export type AuthSession = InferSchemaType<typeof authSessionSchema> & {
  _id: string;
};
export const AuthSessionModel: Model<AuthSession> =
  (models.AuthSession as Model<AuthSession>) ??
  model<AuthSession>("AuthSession", authSessionSchema);
