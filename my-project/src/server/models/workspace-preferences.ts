import { Schema, type InferSchemaType, models, model } from "mongoose";

const workspacePreferencesSchema = new Schema(
  {
    organizationId: {
      type: String,
      required: true,
      immutable: true,
      unique: true,
      index: true,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
      uppercase: true,
      match: /^[A-Z]{3}$/,
    },
    timezone: { type: String, required: true, default: "UTC", maxlength: 100 },
    invoicePrefix: { type: String, required: true, default: "INV", maxlength: 12 },
    invoiceSequence: { type: Number, required: true, default: 0, min: 0 },
    notificationPreferences: {
      emailActivity: { type: Boolean, default: true },
      emailInvoices: { type: Boolean, default: true },
    },
  },
  { timestamps: true, collection: "workspacePreferences" },
);

export type WorkspacePreferences = InferSchemaType<typeof workspacePreferencesSchema>;
export const WorkspacePreferencesModel =
  models.WorkspacePreferences ??
  model("WorkspacePreferences", workspacePreferencesSchema);
