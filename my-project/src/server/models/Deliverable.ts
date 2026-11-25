import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const fileSubSchema = new Schema(
  {
    fileId: { type: String, required: true },
    originalFilename: { type: String, required: true, trim: true },
    storageKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true, min: 1 },
    checksum: { type: String },
    versionNumber: { type: Number, required: true, default: 1 },
    uploadedByUserId: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    comment: { type: String, maxlength: 2000 },
  },
  { _id: false },
);

const reviewSubSchema = new Schema(
  {
    reviewId: { type: String, required: true },
    action: {
      type: String,
      enum: ["submitted", "approved", "revision_requested", "resubmitted"],
      required: true,
    },
    actorUserId: { type: String, required: true },
    comment: { type: String, maxlength: 3000 },
    versionNumber: { type: Number, required: true },
    occurredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const externalLinkSubSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

const deliverableSchema = new Schema(
  {
    organizationId: { type: String, required: true, immutable: true, index: true },
    projectId: { type: Schema.Types.ObjectId, required: true, index: true },
    milestoneId: { type: Schema.Types.ObjectId, default: null, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    normalizedTitle: { type: String, required: true },
    description: { type: String, default: "", maxlength: 5000 },
    status: {
      type: String,
      enum: [
        "draft",
        "in_progress",
        "submitted",
        "approved",
        "revision_required",
        "archived",
      ],
      default: "draft",
      required: true,
    },
    contributorUserIds: [{ type: String }],
    reviewerUserIds: [{ type: String }],
    dueDate: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    currentVersion: { type: Number, required: true, default: 1 },
    files: [fileSubSchema],
    reviews: [reviewSubSchema],
    externalLinks: [externalLinkSubSchema],
    createdByUserId: { type: String, required: true, immutable: true },
    updatedByUserId: { type: String, required: true },
    archivedAt: { type: Date, default: null },
    archivedByUserId: { type: String, default: null },
  },
  { timestamps: true, collection: "deliverables" },
);

deliverableSchema.index({ organizationId: 1, projectId: 1, status: 1 });
deliverableSchema.index({ organizationId: 1, status: 1, dueDate: 1 });
deliverableSchema.index({ organizationId: 1, contributorUserIds: 1 });
deliverableSchema.index({ organizationId: 1, reviewerUserIds: 1 });
deliverableSchema.index({ organizationId: 1, archivedAt: 1, createdAt: -1 });

export type DeliverableDocument = InferSchemaType<typeof deliverableSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const DeliverableModel: Model<DeliverableDocument> =
  (models.Deliverable as Model<DeliverableDocument>) ||
  model<DeliverableDocument>("Deliverable", deliverableSchema);
