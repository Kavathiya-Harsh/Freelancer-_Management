import "server-only";
import { Types } from "mongoose";
import { PaymentModel, type PaymentDocument } from "@/server/models/Payment";
import { InvoiceModel } from "@/server/models/Invoice";
import { ActivityModel } from "@/server/models/Activity";
import { getMongooseConnection } from "@/server/db/mongoose";
import { getMongoDb } from "@/server/db/mongo-client";
import type { PaymentInput, PaymentListArgs } from "@/validations/payment";

type LeanPayment = PaymentDocument & { _id: Types.ObjectId };

const oid = (v: string) => {
  if (!Types.ObjectId.isValid(v)) throw new Error("PAYMENT_NOT_FOUND");
  return new Types.ObjectId(v);
};

const invoiceOid = (v: string) => {
  if (!Types.ObjectId.isValid(v)) throw new Error("INVOICE_NOT_FOUND");
  return new Types.ObjectId(v);
};

export async function recordPayment(org: string, user: string, input: PaymentInput) {
  const connection = await getMongooseConnection();

  // Idempotency check happens before the transaction as a fast response path.
  if (input.idempotencyKey) {
    const existingIdempotent = await PaymentModel.findOne({
      organizationId: org,
      idempotencyKey: input.idempotencyKey,
    }).lean();
    if (existingIdempotent) {
      return existingIdempotent;
    }
  }

  // Validate and stage the mutation so the retryable transaction remains small.
  let result: Record<string, unknown> | null = null;
  const session = await connection.startSession();
  try {
    await session.withTransaction(async () => {
      if (input.idempotencyKey) {
        const existing = await PaymentModel.findOne(
          { organizationId: org, idempotencyKey: input.idempotencyKey },
          null,
          { session },
        ).lean();
        if (existing) {
          result = existing;
          return;
        }
      }

      const invoice = await InvoiceModel.findOne(
        { _id: invoiceOid(input.invoiceId), organizationId: org },
        null,
        { session },
      );

      if (!invoice) throw new Error("INVOICE_NOT_FOUND");
      if (invoice.status === "draft") {
        throw new Error(
          "CANNOT_PAY_DRAFT_INVOICE: Invoice must be issued before recording payment.",
        );
      }
      if (invoice.status === "void") {
        throw new Error(
          "CANNOT_PAY_VOID_INVOICE: Cannot record payment against a voided invoice.",
        );
      }
      if (input.status === "successful" && input.amountMinor > invoice.amountDueMinor) {
        throw new Error(
          `OVERPAYMENT_REJECTED: Payment of ${input.amountMinor} exceeds outstanding balance of ${invoice.amountDueMinor}.`,
        );
      }

      const [payment] = await PaymentModel.create(
        [
          {
            organizationId: org,
            invoiceId: invoice._id,
            clientId: invoice.clientId,
            projectId: invoice.projectId,
            amountMinor: input.amountMinor,
            currency: invoice.currency,
            minorUnit: invoice.minorUnit,
            paymentMethod: input.paymentMethod,
            paymentDate: input.paymentDate || new Date(),
            paidAt:
              input.status === "successful" ? input.paymentDate || new Date() : null,
            kind: "payment",
            status: input.status,
            reference: input.reference || "",
            notes: input.notes || "",
            idempotencyKey: input.idempotencyKey || undefined,
            recordedByUserId: user,
          },
        ],
        { session },
      );

      if (input.status === "successful") {
        invoice.amountPaidMinor += input.amountMinor;
        invoice.amountDueMinor = Math.max(
          0,
          invoice.totalMinor - invoice.amountPaidMinor,
        );
        if (invoice.amountDueMinor === 0) {
          invoice.status = "paid";
          invoice.paidAt = input.paymentDate || new Date();
        }
        invoice.updatedByUserId = user;
        await invoice.save({ session });
      }

      await ActivityModel.create(
        [
          {
            organizationId: org,
            actorUserId: user,
            entityType: "payment",
            entityId: payment._id,
            action:
              input.status === "successful" ? "payment_succeeded" : "payment_recorded",
            metadata: {
              invoiceNumber: invoice.invoiceNumber,
              amountMinor: payment.amountMinor,
              paymentMethod: payment.paymentMethod,
              status: payment.status,
            },
          },
        ],
        { session },
      );
      result = payment.toObject();
    });
  } finally {
    await session.endSession();
  }
  if (!result) throw new Error("PAYMENT_ERROR");
  return result;
}

export async function updatePendingPaymentStatus(
  org: string,
  user: string,
  paymentId: string,
  newStatus: "pending" | "successful" | "failed",
) {
  const connection = await getMongooseConnection();
  let result: Record<string, unknown> | null = null;
  const session = await connection.startSession();
  try {
    await session.withTransaction(async () => {
      const payment = await PaymentModel.findOne(
        { _id: oid(paymentId), organizationId: org },
        null,
        { session },
      );
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");
      if (payment.status === "successful") {
        throw new Error(
          "CANNOT_CHANGE_SUCCESSFUL_PAYMENT: Use reversal workflow to undo successful payments.",
        );
      }
      if (payment.status === "reversed") {
        throw new Error(
          "CANNOT_CHANGE_REVERSED_PAYMENT: Reversed payments cannot be altered.",
        );
      }
      if (payment.status === newStatus) {
        result = payment.toObject();
        return;
      }

      if (newStatus === "successful") {
        const invoice = await InvoiceModel.findOne(
          { _id: payment.invoiceId, organizationId: org },
          null,
          { session },
        );
        if (!invoice) throw new Error("INVOICE_NOT_FOUND");
        if (payment.amountMinor > invoice.amountDueMinor) {
          throw new Error(
            "OVERPAYMENT_REJECTED: Payment exceeds invoice outstanding balance.",
          );
        }
        invoice.amountPaidMinor += payment.amountMinor;
        invoice.amountDueMinor = Math.max(
          0,
          invoice.totalMinor - invoice.amountPaidMinor,
        );
        if (invoice.amountDueMinor === 0) {
          invoice.status = "paid";
          invoice.paidAt = new Date();
        }
        invoice.updatedByUserId = user;
        await invoice.save({ session });
        payment.paidAt = new Date();
      }

      payment.status = newStatus;
      await payment.save({ session });
      await ActivityModel.create(
        [
          {
            organizationId: org,
            actorUserId: user,
            entityType: "payment",
            entityId: payment._id,
            action: newStatus === "successful" ? "payment_succeeded" : "payment_failed",
            metadata: { newStatus, amountMinor: payment.amountMinor },
          },
        ],
        { session },
      );
      result = payment.toObject();
    });
  } finally {
    await session.endSession();
  }
  if (!result) throw new Error("PAYMENT_NOT_FOUND");
  return result;
}

export async function reversePayment(
  org: string,
  user: string,
  paymentId: string,
  reason: string,
) {
  const connection = await getMongooseConnection();
  let reversal: Record<string, unknown> | null = null;
  const session = await connection.startSession();
  try {
    await session.withTransaction(async () => {
      const original = await PaymentModel.findOne(
        { _id: oid(paymentId), organizationId: org },
        null,
        { session },
      );
      if (!original) throw new Error("PAYMENT_NOT_FOUND");
      if (original.status !== "successful") {
        throw new Error(
          "CANNOT_REVERSE_UNSUCCESSFUL_PAYMENT: Only successful payments can be reversed.",
        );
      }

      original.status = "reversed";
      original.reversalReason = reason;
      await original.save({ session });

      const [reversalRecord] = await PaymentModel.create(
        [
          {
            organizationId: org,
            invoiceId: original.invoiceId,
            clientId: original.clientId,
            projectId: original.projectId,
            amountMinor: original.amountMinor,
            currency: original.currency,
            minorUnit: original.minorUnit,
            paymentMethod: original.paymentMethod,
            paymentDate: new Date(),
            paidAt: null,
            kind: "reversal",
            status: "reversed",
            reference: `REVERSAL of ${original._id.toString()}`,
            notes: reason,
            reversalOfPaymentId: original._id,
            reversalReason: reason,
            recordedByUserId: user,
          },
        ],
        { session },
      );

      const invoice = await InvoiceModel.findOne(
        { _id: original.invoiceId, organizationId: org },
        null,
        { session },
      );
      if (invoice) {
        invoice.amountPaidMinor = Math.max(
          0,
          invoice.amountPaidMinor - original.amountMinor,
        );
        invoice.amountDueMinor = Math.max(
          0,
          invoice.totalMinor - invoice.amountPaidMinor,
        );
        if (invoice.status === "paid" && invoice.amountDueMinor > 0) {
          invoice.status = "pending";
          invoice.paidAt = null;
        }
        invoice.updatedByUserId = user;
        await invoice.save({ session });
      }

      await ActivityModel.create(
        [
          {
            organizationId: org,
            actorUserId: user,
            entityType: "payment",
            entityId: reversalRecord._id,
            action: "payment_reversed",
            metadata: {
              originalPaymentId: original._id.toString(),
              amountMinor: original.amountMinor,
              reason,
            },
          },
        ],
        { session },
      );
      reversal = reversalRecord.toObject();
    });
  } finally {
    await session.endSession();
  }
  if (!reversal) throw new Error("PAYMENT_NOT_FOUND");
  return reversal;
}

export async function listPayments(org: string, user: string, args: PaymentListArgs) {
  await getMongooseConnection();

  const filter: Record<string, unknown> = { organizationId: org };

  if (args.invoiceId) {
    filter.invoiceId = invoiceOid(args.invoiceId);
  }
  if (args.clientId) {
    filter.clientId = new Types.ObjectId(args.clientId);
  }
  if (args.projectId) {
    filter.projectId = new Types.ObjectId(args.projectId);
  }
  if (args.status && args.status !== "all") {
    filter.status = args.status;
  }
  if (args.paymentMethod && args.paymentMethod !== "all") {
    filter.paymentMethod = args.paymentMethod;
  }
  if (args.search?.trim()) {
    filter.reference = { $regex: args.search.trim(), $options: "i" };
  }

  const sortOrder = args.sortOrder === "asc" ? 1 : -1;
  const skip = (args.page - 1) * args.limit;

  const [items, total] = await Promise.all([
    PaymentModel.find(filter)
      .sort({ paymentDate: sortOrder })
      .skip(skip)
      .limit(args.limit)
      .lean(),
    PaymentModel.countDocuments(filter),
  ]);

  // Enrich with invoice and client details
  const invoiceIds = Array.from(new Set(items.map((p) => p.invoiceId.toString())));
  const clientIds = Array.from(new Set(items.map((p) => p.clientId.toString())));

  const [invoices, clients] = await Promise.all([
    InvoiceModel.find({
      organizationId: org,
      _id: { $in: invoiceIds.map((id) => new Types.ObjectId(id)) },
    })
      .select("invoiceNumber totalMinor status dueDate")
      .lean(),
    getMongoDb().then((db) =>
      db
        .collection("clients")
        .find({
          organizationId: org,
          _id: { $in: clientIds.map((id) => new Types.ObjectId(id)) },
        })
        .project({ name: 1, companyName: 1 })
        .toArray(),
    ),
  ]);

  const invoiceMap = new Map(invoices.map((inv) => [inv._id.toString(), inv]));
  const clientMap = new Map(clients.map((c) => [c._id.toString(), c]));

  const enriched = items.map((p) => ({
    ...p,
    invoice: invoiceMap.get(p.invoiceId.toString()) || null,
    client: clientMap.get(p.clientId.toString()) || null,
  }));

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

export async function getPaymentById(org: string, paymentId: string) {
  await getMongooseConnection();

  const payment = (await PaymentModel.findOne({
    _id: oid(paymentId),
    organizationId: org,
  }).lean()) as LeanPayment | null;

  if (!payment) throw new Error("PAYMENT_NOT_FOUND");

  const [invoice, client] = await Promise.all([
    InvoiceModel.findOne({
      _id: payment.invoiceId,
      organizationId: org,
    })
      .select("invoiceNumber totalMinor status")
      .lean(),
    getMongoDb().then((db) =>
      db.collection("clients").findOne({
        _id: payment.clientId,
        organizationId: org,
      }),
    ),
  ]);

  return {
    ...payment,
    invoice: invoice || null,
    client: client || null,
  };
}

export async function getPaymentStatistics(org: string) {
  await getMongooseConnection();
  const rows = await PaymentModel.aggregate<{
    status: string;
    currency: string;
    count: number;
    amountMinor: number;
  }>([
    { $match: { organizationId: org } },
    {
      $group: {
        _id: { status: "$status", currency: "$currency" },
        count: { $sum: 1 },
        amountMinor: { $sum: "$amountMinor" },
      },
    },
    {
      $project: {
        _id: 0,
        status: "$_id.status",
        currency: "$_id.currency",
        count: 1,
        amountMinor: 1,
      },
    },
  ]);
  return rows;
}
