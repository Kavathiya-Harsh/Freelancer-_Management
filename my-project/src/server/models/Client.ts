import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const address = new Schema(
  {
    addressLine1: { type: String, maxlength: 200 },
    addressLine2: { type: String, maxlength: 200 },
    city: { type: String, maxlength: 100 },
    state: { type: String, maxlength: 100 },
    postalCode: { type: String, maxlength: 30 },
    country: { type: String, maxlength: 100 },
  },
  { _id: false },
);

const schema = new Schema(
  {
    organizationId: { type: String, required: true, immutable: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    companyName: { type: String, trim: true, maxlength: 200 },
    email: { type: String, trim: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 50 },
    website: { type: String, trim: true, maxlength: 2048 },
    billingAddress: address,
    notes: { type: String, trim: true, maxlength: 5000 },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      required: true,
    },
    normalizedName: { type: String, required: true, immutable: true },
    normalizedEmail: { type: String },
    normalizedCompanyName: { type: String },
    createdByUserId: { type: String, required: true, immutable: true },
    updatedByUserId: { type: String, required: true },
    archivedAt: { type: Date, default: null },
    archivedByUserId: { type: String, default: null },
  },
  { timestamps: true, collection: "clients" },
);

schema.index({ organizationId: 1, status: 1, createdAt: -1 });
schema.index({ organizationId: 1, normalizedName: 1 });
schema.index({ organizationId: 1, normalizedEmail: 1 });
schema.index({ organizationId: 1, normalizedCompanyName: 1 });

export type Client = InferSchemaType<typeof schema> & {
  _id: Schema.Types.ObjectId;
};

export const ClientModel: Model<Client> =
  (models.Client as Model<Client>) ?? model<Client>("Client", schema);
