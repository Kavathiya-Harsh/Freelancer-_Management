import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const authTokenSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, immutable: true, index: true },
    type: {
      type: String,
      enum: ["email-verification", "password-reset"],
      required: true,
      immutable: true,
    },
    tokenHash: { type: String, required: true, immutable: true },
    createdAt: { type: Date, required: true, default: Date.now, immutable: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: false, collection: "authTokens" },
);

authTokenSchema.index({ tokenHash: 1 }, { unique: true });
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AuthToken = InferSchemaType<typeof authTokenSchema> & { _id: string };
export const AuthTokenModel: Model<AuthToken> =
  (models.AuthToken as Model<AuthToken>) ?? model<AuthToken>("AuthToken", authTokenSchema);
