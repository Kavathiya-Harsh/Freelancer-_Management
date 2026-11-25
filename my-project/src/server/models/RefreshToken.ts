import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    _id: { type: String, required: true },
    sessionId: { type: String, required: true, immutable: true, index: true },
    userId: { type: String, required: true, immutable: true, index: true },
    tokenHash: { type: String, required: true, immutable: true },
    tokenFamilyId: { type: String, required: true, immutable: true, index: true },
    createdAt: { type: Date, required: true, default: Date.now, immutable: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    replacedByTokenId: { type: String, default: null },
  },
  { timestamps: false, collection: "authRefreshTokens" },
);

refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshToken = InferSchemaType<typeof refreshTokenSchema> & {
  _id: string;
};
export const RefreshTokenModel: Model<RefreshToken> =
  (models.RefreshToken as Model<RefreshToken>) ??
  model<RefreshToken>("RefreshToken", refreshTokenSchema);
