import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const schema = new Schema(
  {
    organizationId: { type: String, required: true, immutable: true, index: true },
    projectId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 5000 },
    status: {
      type: String,
      enum: ["upcoming", "in_progress", "completed"],
      default: "upcoming",
      required: true,
    },
    dueDate: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    completedByUserId: { type: String, default: null },
    order: { type: Number, default: 0 },
    targetAmountMinor: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "USD", length: 3 },
    createdByUserId: { type: String, required: true, immutable: true },
    updatedByUserId: { type: String, required: true },
    archivedAt: { type: Date, default: null },
    archivedByUserId: { type: String, default: null },
  },
  { timestamps: true, collection: "milestones" },
);

schema.index({ organizationId: 1, projectId: 1, dueDate: 1 });
schema.index({ organizationId: 1, projectId: 1, status: 1 });
schema.index({ organizationId: 1, order: 1 });

export type MilestoneDocument = InferSchemaType<typeof schema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const MilestoneModel: Model<MilestoneDocument> =
  (models.Milestone as Model<MilestoneDocument>) ??
  model<MilestoneDocument>("Milestone", schema);
