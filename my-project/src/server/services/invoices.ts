import "server-only";
import { Types } from "mongoose";
import { randomUUID } from "node:crypto";
import { InvoiceModel, type InvoiceDocument } from "@/server/models/Invoice";
import { PaymentModel } from "@/server/models/Payment";
import { ClientModel } from "@/server/models/Client";
import { ProjectModel } from "@/server/models/Project";
import { WorkspacePreferencesModel } from "@/server/models/workspace-preferences";
import { ActivityModel } from "@/server/models/Activity";
import { getMongooseConnection } from "@/server/db/mongoose";
import { getMongoDb } from "@/server/db/mongo-client";
import { getCurrencyMinorUnit } from "@/server/finance/currencies";
import { calculateInvoiceTotals } from "@/server/finance/calculator";
import type {
  InvoiceInput,
  InvoiceUpdateInput,
  InvoiceListArgs,
  InvoiceStatus,
} from "@/validations/invoice";

type LeanInvoice = InvoiceDocument & { _id: Types.ObjectId };

const oid = (v: string) => {
  if (!Types.ObjectId.isValid(v)) throw new Error("INVOICE_NOT_FOUND");
  return new Types.ObjectId(v);
};

const clientOid = (v: string) => {
  if (!Types.ObjectId.isValid(v)) throw new Error("CLIENT_NOT_FOUND");
  return new Types.ObjectId(v);
};

const projectOid = (v: string) => {
  if (!Types.ObjectId.isValid(v)) throw new Error("PROJECT_NOT_FOUND");
  return new Types.ObjectId(v);
};

/**
 * Derives overdue status dynamically based on current date, status and remaining balance.
 */
export function computeInvoiceStatus(
  status: InvoiceStatus,
  dueDate: Date,
  amountDueMinor: number,
): InvoiceStatus {
  if (status === "draft" || status === "void" || status === "paid") {
    return status;
  }
  if (amountDueMinor === 0) {
    return "paid";
  }
  if (new Date(dueDate).getTime() < Date.now()) {
    return "overdue";
  }
  return status;
}

export async function createInvoice(org: string, user: string, input: InvoiceInput) {
  await getMongooseConnection();

  // 1. Validate Client
  const client = await ClientModel.findOne({
    _id: clientOid(input.clientId),
    organizationId: org,
  }).lean();

  if (!client) throw new Error("CLIENT_NOT_FOUND");
  if (client.status === "archived") throw new Error("CLIENT_ARCHIVED");

  // 2. Validate Project if specified
  let projectObjectId: Types.ObjectId | null = null;
  if (input.projectId) {
    const project = await ProjectModel.findOne({
      _id: projectOid(input.projectId),
      organizationId: org,
    }).lean();

    if (!project) throw new Error("PROJECT_NOT_FOUND");
    if (project.archivedAt) throw new Error("PROJECT_ARCHIVED");
    projectObjectId = new Types.ObjectId(String(project._id));
  }

  // 3. Currency and precision
  const currency = (input.currency || "USD").toUpperCase();
  const minorUnit = getCurrencyMinorUnit(currency);

  // 4. Calculate integer line totals and subtotal
  const totals = calculateInvoiceTotals(input.lineItems, 0);

  // 5. Generate draft placeholder number
  const draftInvoiceNumber = `DRAFT-${randomUUID().slice(0, 8).toUpperCase()}`;

  // 6. Build Client Snapshot
  const clientSnapshot = {
    name: client.name,
    companyName: client.companyName || "",
    email: client.email || "",
    phone: client.phone || "",
    billingAddress:
      client.billingAddress?.addressLine1 || client.billingAddress?.city || "",
  };

  // 7. Build Issuer Snapshot from Workspace organization
  const db = await getMongoDb();
  const orgDoc = await db.collection("organization").findOne({ id: org });
  const issuerSnapshot = {
    name: orgDoc?.name || "Independent Professional",
    email: orgDoc?.email || "",
    address: "",
    taxId: "",
  };

  // 8. Create Invoice document
  const invoice = await InvoiceModel.create({
    organizationId: org,
    clientId: client._id,
    projectId: projectObjectId,
    invoiceNumber: draftInvoiceNumber,
    status: "draft",
    currency,
    minorUnit,
    issueDate: input.issueDate || new Date(),
    dueDate: input.dueDate,
    lineItems: totals.lineItems.map((li) => ({
      description: li.description,
      quantityMilli: li.quantityMilli,
      unitAmountMinor: li.unitAmountMinor,
      lineDiscountMinor: li.lineDiscountMinor,
      taxRateBasisPoints: li.taxRateBasisPoints,
      lineTotalMinor: li.lineTotalMinor,
    })),
    subtotalMinor: totals.subtotalMinor,
    discountMinor: totals.discountMinor,
    taxMinor: totals.taxMinor,
    totalMinor: totals.totalMinor,
    amountPaidMinor: 0,
    amountDueMinor: totals.amountDueMinor,
    issuerSnapshot,
    clientSnapshot,
    notes: input.notes || "",
    terms: input.terms || "",
    createdByUserId: user,
    updatedByUserId: user,
  });

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "invoice",
    entityId: invoice._id,
    action: "created",
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      totalMinor: invoice.totalMinor,
      currency: invoice.currency,
    },
  });

  return invoice.toObject();
}

export async function listInvoices(org: string, args: InvoiceListArgs) {
  await getMongooseConnection();

  const filter: Record<string, unknown> = { organizationId: org };

  if (args.view === "active") {
    filter.archivedAt = null;
  } else if (args.view === "archived") {
    filter.archivedAt = { $ne: null };
  }

  if (args.clientId) {
    filter.clientId = clientOid(args.clientId);
  }

  if (args.projectId) {
    filter.projectId = projectOid(args.projectId);
  }

  if (args.search?.trim()) {
    filter.invoiceNumber = { $regex: args.search.trim(), $options: "i" };
  }

  // Handle specific status filter
  if (args.status && args.status !== "all") {
    if (args.status === "overdue") {
      filter.status = "pending";
      filter.dueDate = { $lt: new Date() };
      filter.amountDueMinor = { $gt: 0 };
    } else {
      filter.status = args.status;
    }
  }

  const sortOrder = args.sortOrder === "asc" ? 1 : -1;
  const sortObj: Record<string, 1 | -1> = { [args.sortBy]: sortOrder };
  const skip = (args.page - 1) * args.limit;

  const [items, total] = await Promise.all([
    InvoiceModel.find(filter).sort(sortObj).skip(skip).limit(args.limit).lean(),
    InvoiceModel.countDocuments(filter),
  ]);

  // Enrich with live dynamic overdue status and project/client summaries
  const clientIds = Array.from(new Set(items.map((i) => i.clientId.toString())));
  const projectIds = Array.from(
    new Set(items.filter((i) => i.projectId).map((i) => i.projectId!.toString())),
  );

  const [clients, projects] = await Promise.all([
    ClientModel.find({
      organizationId: org,
      _id: { $in: clientIds.map((c) => new Types.ObjectId(c)) },
    })
      .select("name companyName email")
      .lean(),
    ProjectModel.find({
      organizationId: org,
      _id: { $in: projectIds.map((p) => new Types.ObjectId(p)) },
    })
      .select("name projectCode")
      .lean(),
  ]);

  const clientMap = new Map(clients.map((c) => [c._id.toString(), c]));
  const projectMap = new Map(projects.map((p) => [p._id.toString(), p]));

  const enriched = items.map((inv) => {
    const computedStatus = computeInvoiceStatus(
      inv.status as InvoiceStatus,
      inv.dueDate,
      inv.amountDueMinor,
    );
    const client = clientMap.get(inv.clientId.toString());
    const project = inv.projectId ? projectMap.get(inv.projectId.toString()) : null;

    return {
      ...inv,
      computedStatus,
      client: client
        ? {
            _id: client._id.toString(),
            name: client.name,
            companyName: client.companyName,
          }
        : null,
      project: project
        ? {
            _id: project._id.toString(),
            name: project.name,
            projectCode: project.projectCode,
          }
        : null,
    };
  });

  return {
    items: enriched,
    pagination: {
      page: args.page,
      limit: args.limit,
      total,
      totalPages: Math.ceil(total / args.limit) || 1,
    },
  };
}

export async function getInvoiceById(org: string, id: string) {
  await getMongooseConnection();

  const invoice = (await InvoiceModel.findOne({
    _id: oid(id),
    organizationId: org,
  }).lean()) as LeanInvoice | null;

  if (!invoice) throw new Error("INVOICE_NOT_FOUND");

  const computedStatus = computeInvoiceStatus(
    invoice.status as InvoiceStatus,
    invoice.dueDate,
    invoice.amountDueMinor,
  );

  // Load client and project
  const [client, project, payments, activities] = await Promise.all([
    ClientModel.findOne({
      _id: invoice.clientId,
      organizationId: org,
    })
      .select("name companyName email phone billingAddress")
      .lean(),
    invoice.projectId
      ? ProjectModel.findOne({
          _id: invoice.projectId,
          organizationId: org,
        })
          .select("name projectCode status")
          .lean()
      : null,
    PaymentModel.find({ invoiceId: invoice._id, organizationId: org })
      .sort({ paymentDate: -1 })
      .lean(),
    ActivityModel.find({
      organizationId: org,
      entityType: "invoice",
      entityId: invoice._id,
    })
      .sort({ occurredAt: -1 })
      .limit(20)
      .lean(),
  ]);

  return {
    ...invoice,
    computedStatus,
    client: client
      ? {
          _id: client._id.toString(),
          name: client.name,
          companyName: client.companyName,
          email: client.email,
          phone: client.phone,
          billingAddress: client.billingAddress,
        }
      : null,
    project: project
      ? {
          _id: project._id.toString(),
          name: project.name,
          projectCode: project.projectCode,
          status: project.status,
        }
      : null,
    payments,
    activities,
  };
}

export async function updateDraftInvoice(
  org: string,
  user: string,
  id: string,
  input: InvoiceUpdateInput,
) {
  await getMongooseConnection();

  const existing = await InvoiceModel.findOne({
    _id: oid(id),
    organizationId: org,
  });

  if (!existing) throw new Error("INVOICE_NOT_FOUND");
  if (existing.status !== "draft") {
    throw new Error("CANNOT_EDIT_ISSUED_INVOICE: Only draft invoices can be modified.");
  }

  // Update client if specified
  if (input.clientId) {
    const client = await ClientModel.findOne({
      _id: clientOid(input.clientId),
      organizationId: org,
    }).lean();
    if (!client) throw new Error("CLIENT_NOT_FOUND");
    existing.clientId = new Types.ObjectId(String(client._id));
    existing.clientSnapshot = {
      name: client.name,
      companyName: client.companyName || "",
      email: client.email || "",
      phone: client.phone || "",
      billingAddress:
        client.billingAddress?.addressLine1 || client.billingAddress?.city || "",
    };
  }

  // Update project if specified
  if (input.projectId !== undefined) {
    if (input.projectId) {
      const project = await ProjectModel.findOne({
        _id: projectOid(input.projectId),
        organizationId: org,
      }).lean();
      if (!project) throw new Error("PROJECT_NOT_FOUND");
      existing.projectId = new Types.ObjectId(String(project._id));
    } else {
      existing.projectId = null;
    }
  }

  if (input.currency) {
    existing.currency = input.currency.toUpperCase();
    existing.minorUnit = getCurrencyMinorUnit(existing.currency);
  }

  if (input.issueDate) existing.issueDate = input.issueDate;
  if (input.dueDate) existing.dueDate = input.dueDate;
  if (input.notes !== undefined) existing.notes = input.notes;
  if (input.terms !== undefined) existing.terms = input.terms;

  // Recalculate line items if provided
  if (input.lineItems && input.lineItems.length > 0) {
    const totals = calculateInvoiceTotals(input.lineItems, existing.amountPaidMinor);
    existing.lineItems = totals.lineItems.map((li) => ({
      description: li.description,
      quantityMilli: li.quantityMilli,
      unitAmountMinor: li.unitAmountMinor,
      lineDiscountMinor: li.lineDiscountMinor,
      taxRateBasisPoints: li.taxRateBasisPoints,
      lineTotalMinor: li.lineTotalMinor,
    })) as typeof existing.lineItems;
    existing.subtotalMinor = totals.subtotalMinor;
    existing.discountMinor = totals.discountMinor;
    existing.taxMinor = totals.taxMinor;
    existing.totalMinor = totals.totalMinor;
    existing.amountDueMinor = totals.amountDueMinor;
  }

  existing.updatedByUserId = user;
  await existing.save();

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "invoice",
    entityId: existing._id,
    action: "updated",
    metadata: {
      totalMinor: existing.totalMinor,
    },
  });

  return existing.toObject();
}

/**
 * Issues a draft invoice, allocating a unique, atomic, sequence-based invoice number
 * and freezing historical snapshots.
 */
export async function issueInvoice(org: string, user: string, id: string) {
  const connection = await getMongooseConnection();
  let issued: Record<string, unknown> | null = null;
  const session = await connection.startSession();
  try {
    await session.withTransaction(async () => {
      const existing = await InvoiceModel.findOne(
        { _id: oid(id), organizationId: org },
        null,
        { session },
      );
      if (!existing) throw new Error("INVOICE_NOT_FOUND");
      if (existing.status !== "draft") {
        throw new Error(
          `INVOICE_ALREADY_ISSUED: Cannot issue an invoice in status ${existing.status}.`,
        );
      }

      const year = new Date().getFullYear();
      const prefs = await WorkspacePreferencesModel.findOneAndUpdate(
        { organizationId: org },
        { $inc: { invoiceSequence: 1 } },
        { new: true, upsert: true, session },
      );
      if (!prefs) throw new Error("WORKSPACE_PREFERENCES_NOT_FOUND");
      const prefix = prefs.invoicePrefix || "INV";
      const seqNum = prefs.invoiceSequence || 1;
      const officialInvoiceNumber = `${prefix}-${year}-${String(seqNum).padStart(4, "0")}`;

      existing.invoiceNumber = officialInvoiceNumber;
      existing.status = "pending";
      existing.issuedAt = new Date();
      existing.updatedByUserId = user;
      await existing.save({ session });

      await ActivityModel.create(
        [
          {
            organizationId: org,
            actorUserId: user,
            entityType: "invoice",
            entityId: existing._id,
            action: "issued",
            metadata: {
              invoiceNumber: officialInvoiceNumber,
              totalMinor: existing.totalMinor,
              dueDate: existing.dueDate,
            },
          },
        ],
        { session },
      );
      issued = existing.toObject();
    });
  } finally {
    await session.endSession();
  }
  if (!issued) throw new Error("INVOICE_NOT_FOUND");
  return issued;
}

export async function voidInvoice(
  org: string,
  user: string,
  id: string,
  reason?: string,
) {
  await getMongooseConnection();

  const existing = await InvoiceModel.findOne({
    _id: oid(id),
    organizationId: org,
  });

  if (!existing) throw new Error("INVOICE_NOT_FOUND");
  if (existing.status === "void") {
    throw new Error("INVOICE_ALREADY_VOID: This invoice is already voided.");
  }
  if (existing.amountPaidMinor > 0) {
    throw new Error(
      "CANNOT_VOID_PAID_INVOICE: Invoice has recorded payments. Reverse payments before voiding.",
    );
  }

  existing.status = "void";
  existing.voidedAt = new Date();
  existing.updatedByUserId = user;
  await existing.save();

  await ActivityModel.create({
    organizationId: org,
    actorUserId: user,
    entityType: "invoice",
    entityId: existing._id,
    action: "voided",
    metadata: {
      reason: reason || "Voided by user request",
    },
  });

  return existing.toObject();
}

export async function getInvoiceStatistics(org: string) {
  await getMongooseConnection();
  return InvoiceModel.aggregate<{
    currency: string;
    count: number;
    totalInvoicedMinor: number;
    totalPaidMinor: number;
    totalOutstandingMinor: number;
    totalOverdueMinor: number;
  }>([
    {
      $match: {
        organizationId: org,
        archivedAt: null,
        status: { $nin: ["void", "draft"] },
      },
    },
    {
      $group: {
        _id: "$currency",
        count: { $sum: 1 },
        totalInvoicedMinor: { $sum: "$totalMinor" },
        totalPaidMinor: { $sum: "$amountPaidMinor" },
        totalOutstandingMinor: { $sum: "$amountDueMinor" },
        totalOverdueMinor: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "pending"] },
                  { $lt: ["$dueDate", new Date()] },
                  { $gt: ["$amountDueMinor", 0] },
                ],
              },
              "$amountDueMinor",
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        currency: "$_id",
        count: 1,
        totalInvoicedMinor: 1,
        totalPaidMinor: 1,
        totalOutstandingMinor: 1,
        totalOverdueMinor: 1,
      },
    },
    { $sort: { currency: 1 } },
  ]);
}
