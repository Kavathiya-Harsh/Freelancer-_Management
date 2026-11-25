import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const lineItemSubSchema = new Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 300 },
    quantityMilli: { type: Number, required: true, min: 1 },
    unitAmountMinor: { type: Number, required: true, min: 0 },
    lineDiscountMinor: { type: Number, default: 0, min: 0 },
    taxRateBasisPoints: { type: Number, default: 0, min: 0, max: 10000 },
    lineTotalMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const issuerSnapshotSubSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    taxId: { type: String, trim: true },
  },
  { _id: false },
);

const clientSnapshotSubSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    billingAddress: { type: String, trim: true },
  },
  { _id: false },
);

const invoiceSchema = new Schema(
  {
    organizationId: { type: String, required: true, immutable: true, index: true },
    clientId: { type: Schema.Types.ObjectId, required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, default: null, index: true },
    invoiceNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["draft", "pending", "paid", "overdue", "void"],
      default: "draft",
      required: true,
      index: true,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{3}$/,
      default: "USD",
    },
    minorUnit: { type: Number, required: true, default: 2 },
    issueDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    lineItems: [lineItemSubSchema],
    subtotalMinor: { type: Number, required: true, min: 0 },
    discountMinor: { type: Number, required: true, default: 0, min: 0 },
    taxMinor: { type: Number, required: true, default: 0, min: 0 },
    totalMinor: { type: Number, required: true, min: 0 },
    amountPaidMinor: { type: Number, required: true, default: 0, min: 0 },
    amountDueMinor: { type: Number, required: true, min: 0 },
    issuerSnapshot: issuerSnapshotSubSchema,
    clientSnapshot: clientSnapshotSubSchema,
    notes: { type: String, default: "", maxlength: 2000 },
    terms: { type: String, default: "", maxlength: 2000 },
    createdByUserId: { type: String, required: true, immutable: true },
    updatedByUserId: { type: String, required: true },
    issuedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    voidedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "invoices" },
);

invoiceSchema.index({ organizationId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ organizationId: 1, status: 1, dueDate: 1 });
invoiceSchema.index({ organizationId: 1, clientId: 1, status: 1 });
invoiceSchema.index({ organizationId: 1, projectId: 1, status: 1 });
invoiceSchema.index({ organizationId: 1, archivedAt: 1, createdAt: -1 });

export type InvoiceDocument = InferSchemaType<typeof invoiceSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const InvoiceModel: Model<InvoiceDocument> =
  (models.Invoice as Model<InvoiceDocument>) ||
  model<InvoiceDocument>("Invoice", invoiceSchema);
