import { Schema, model, models } from "mongoose";
const schema = new Schema(
  {
    organizationId: { type: String, required: true, index: true, immutable: true },
    actorUserId: { type: String, required: true, immutable: true },
    entityType: {
      type: String,
      enum: [
        "client",
        "project",
        "workspace",
        "task",
        "milestone",
        "deliverable",
        "invoice",
        "payment",
      ],
      required: true,
      immutable: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    action: {
      type: String,
      enum: [
        "created",
        "updated",
        "archived",
        "restored",
        "status_changed",
        "assigned",
        "completed",
        "reopened",
        "submitted",
        "approved",
        "revision_requested",
        "resubmitted",
        "file_uploaded",
        "issued",
        "voided",
        "payment_recorded",
        "payment_succeeded",
        "payment_failed",
        "payment_reversed",
      ],
      required: true,
      immutable: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now, immutable: true },
  },
  { collection: "activities", versionKey: false },
);
schema.index({ organizationId: 1, entityType: 1, entityId: 1, occurredAt: -1 });
export const ActivityModel = models.Activity ?? model("Activity", schema);
