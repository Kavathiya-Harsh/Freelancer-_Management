import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, maxlength: 254 },
    normalizedEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, select: false },
    emailVerifiedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
      required: true,
    },
    passwordResetRequired: { type: Boolean, default: false, required: true },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "users" },
);

userSchema.index({ normalizedEmail: 1 }, { unique: true });

export type User = InferSchemaType<typeof userSchema> & { _id: string };
export const UserModel: Model<User> =
  (models.User as Model<User>) ?? model<User>("User", userSchema);
