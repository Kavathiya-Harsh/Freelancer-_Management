import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const schema = new Schema(
  {
    organizationId: { type: String, required: true, immutable: true, index: true },
    projectId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    normalizedTitle: { type: String, required: true },
    description: { type: String, default: "", maxlength: 5000 },
    status: {
      type: String,
      enum: ["todo", "in_progress", "in_review", "done", "blocked"],
      default: "todo",
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      required: true,
    },
    assigneeUserIds: [{ type: String }],
    reporterUserId: { type: String, required: true },
    startDate: Date,
    dueDate: Date,
    estimatedMinutes: { type: Number, default: 0, min: 0 },
    actualMinutes: { type: Number, default: 0, min: 0 },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    tags: [{ type: String }],
    completedAt: { type: Date, default: null },
    completedByUserId: { type: String, default: null },
    createdByUserId: { type: String, required: true, immutable: true },
    updatedByUserId: { type: String, required: true },
    archivedAt: { type: Date, default: null },
    archivedByUserId: { type: String, default: null },
  },
  { timestamps: true, collection: "tasks" },
);

schema.index({ organizationId: 1, projectId: 1, status: 1, dueDate: 1 });
schema.index({ organizationId: 1, assigneeUserIds: 1, status: 1 });
schema.index({ organizationId: 1, priority: 1, dueDate: 1 });
schema.index({ organizationId: 1, archivedAt: 1, createdAt: -1 });

export type TaskDocument = InferSchemaType<typeof schema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const TaskModel: Model<TaskDocument> =
  (models.Task as Model<TaskDocument>) ?? model<TaskDocument>("Task", schema);
