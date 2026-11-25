import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const schema = new Schema(
  {
    organizationId: { type: String, required: true, immutable: true, index: true },
    clientId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    projectCode: { type: String, required: true, trim: true, maxlength: 32 },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    normalizedName: { type: String, required: true },
    description: { type: String, default: "", maxlength: 5000 },
    status: {
      type: String,
      enum: ["planning", "in_progress", "on_hold", "completed", "cancelled"],
      default: "planning",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    budgetMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, length: 3 },
    minorUnit: { type: Number, required: true, min: 0, max: 3 },
    startDate: Date,
    dueDate: Date,
    progressPercent: { type: Number, min: 0, max: 100, default: 0 },
    memberUserIds: [{ type: String }],
    tags: [{ type: String }],
    createdByUserId: { type: String, required: true, immutable: true },
    updatedByUserId: { type: String, required: true },
    archivedAt: { type: Date, default: null },
    archivedByUserId: { type: String, default: null },
  },
  { timestamps: true, collection: "projects" },
);

schema.index({ organizationId: 1, projectCode: 1 }, { unique: true });
schema.index({ organizationId: 1, status: 1, createdAt: -1 });
schema.index({ organizationId: 1, clientId: 1, status: 1 });
schema.index({ organizationId: 1, priority: 1, dueDate: 1 });
schema.index({ organizationId: 1, normalizedName: 1 });

export type ProjectDocument = InferSchemaType<typeof schema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ProjectModel: Model<ProjectDocument> =
  (models.Project as Model<ProjectDocument>) ?? model<ProjectDocument>("Project", schema);
