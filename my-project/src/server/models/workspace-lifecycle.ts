import { Schema, type InferSchemaType, models, model } from "mongoose";

const workspaceLifecycleSchema = new Schema(
  {
    organizationId: {
      type: String,
      required: true,
      immutable: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "archived"],
      default: "active",
    },
    archivedAt: { type: Date, default: null },
    archivedByUserId: { type: String, default: null },
  },
  { timestamps: true, collection: "workspaceLifecycles" },
);

workspaceLifecycleSchema.index({ status: 1, updatedAt: -1 });
export type WorkspaceLifecycle = InferSchemaType<typeof workspaceLifecycleSchema>;
export const WorkspaceLifecycleModel =
  models.WorkspaceLifecycle ?? model("WorkspaceLifecycle", workspaceLifecycleSchema);
