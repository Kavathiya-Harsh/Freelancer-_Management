import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const paymentSchema = new Schema(
  {
    organizationId: { type: String, required: true, immutable: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, default: null, index: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{3}$/,
    },
    minorUnit: { type: Number, required: true, default: 2 },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "upi", "cheque", "other"],
      required: true,
    },
    paymentDate: { type: Date, required: true, default: Date.now },
    paidAt: { type: Date, default: null },
    kind: {
      type: String,
      enum: ["payment", "reversal", "adjustment"],
      default: "payment",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "successful", "failed", "reversed"],
      default: "successful",
      required: true,
      index: true,
    },
    reference: { type: String, trim: true, maxlength: 100 },
    notes: { type: String, trim: true, maxlength: 1000 },
    idempotencyKey: { type: String, trim: true },
    reversalOfPaymentId: { type: Schema.Types.ObjectId, default: null },
    reversalReason: { type: String, trim: true, maxlength: 500 },
    recordedByUserId: { type: String, required: true, immutable: true },
  },
  { timestamps: true, collection: "payments" },
);

paymentSchema.index(
  { organizationId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true },
);
paymentSchema.index({ organizationId: 1, invoiceId: 1, status: 1 });
paymentSchema.index({ organizationId: 1, clientId: 1, status: 1 });
paymentSchema.index({ organizationId: 1, paymentDate: -1 });

export type PaymentDocument = InferSchemaType<typeof paymentSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const PaymentModel: Model<PaymentDocument> =
  (models.Payment as Model<PaymentDocument>) ||
  model<PaymentDocument>("Payment", paymentSchema);
