import "server-only";
import { getMongooseConnection } from "@/server/db/mongoose";
import { ClientModel } from "@/server/models/Client";
import { ProjectModel } from "@/server/models/Project";
import { TaskModel } from "@/server/models/Task";
import { MilestoneModel } from "@/server/models/Milestone";
import { InvoiceModel } from "@/server/models/Invoice";
import { PaymentModel } from "@/server/models/Payment";
import { ActivityModel } from "@/server/models/Activity";
import { WorkspacePreferencesModel } from "@/server/models/workspace-preferences";
import { getMongoDb } from "@/server/db/mongo-client";
import {
  isValidTimeZone,
  successfulPaymentMatch,
  type AnalyticsRange,
} from "@/server/analytics/range";
import type { WorkspaceRole } from "@/auth/permissions";

const financialRoles: WorkspaceRole[] = ["owner", "admin"];
const activeProjectStatuses = ["planning", "in_progress", "on_hold"];
const activeTaskStatuses = ["todo", "in_progress", "in_review", "blocked"];
const MAX_ROWS = 8;

type CurrencyTotal = { currency: string; amountMinor: number };

async function currencyTotals(match: Record<string, unknown>) {
  return (await PaymentModel.aggregate<CurrencyTotal>([
    { $match: match },
    { $group: { _id: "$currency", amountMinor: { $sum: "$amountMinor" } } },
    { $project: { _id: 0, currency: "$_id", amountMinor: 1 } },
    { $sort: { currency: 1 } },
  ])) as CurrencyTotal[];
}

export async function getWorkspaceAnalyticsOptions(organizationId: string) {
  await getMongooseConnection();
  const preferences = await WorkspacePreferencesModel.findOne({ organizationId }).lean<{
    timezone?: string;
  }>();
  return {
    timezone: isValidTimeZone(preferences?.timezone ?? "")
      ? preferences!.timezone!
      : "UTC",
  };
}

export async function getDashboardAnalytics(
  organizationId: string,
  role: WorkspaceRole,
  range: AnalyticsRange,
  timezone: string,
) {
  await getMongooseConnection();
  const canViewFinancials = financialRoles.includes(role);
  const now = new Date();
  const baseActive = { organizationId, archivedAt: null };
  const nonFinancialActivity = canViewFinancials
    ? {}
    : { entityType: { $nin: ["invoice", "payment"] } };
  const grouping =
    range.end.getTime() - range.start.getTime() > 92 * 86_400_000 ? "%Y-%m" : "%Y-%m-%d";

  const [clients, projects, clientProjects, tasks, milestones, activity, workspace] =
    await Promise.all([
      ClientModel.aggregate([
        { $match: { organizationId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      ProjectModel.aggregate([
        { $match: baseActive },
        {
          $facet: {
            statuses: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
            priorities: [{ $group: { _id: "$priority", count: { $sum: 1 } } }],
            budgets: [
              { $group: { _id: "$currency", amountMinor: { $sum: "$budgetMinor" } } },
            ],
          },
        },
      ]),
      ProjectModel.aggregate([
        { $match: baseActive },
        { $group: { _id: "$clientId", projectCount: { $sum: 1 } } },
        { $sort: { projectCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "clients",
            let: { clientId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$_id", "$$clientId"] },
                      { $eq: ["$organizationId", organizationId] },
                    ],
                  },
                },
              },
              { $project: { name: 1, companyName: 1 } },
            ],
            as: "client",
          },
        },
        { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
      ]),
      TaskModel.aggregate([
        { $match: baseActive },
        {
          $facet: {
            statuses: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
            overdue: [
              { $match: { status: { $in: activeTaskStatuses }, dueDate: { $lt: now } } },
              { $count: "count" },
            ],
          },
        },
      ]),
      MilestoneModel.find({
        organizationId,
        archivedAt: null,
        status: { $ne: "completed" },
        dueDate: { $lt: range.end },
      })
        .select("projectId title dueDate status")
        .sort({ dueDate: 1 })
        .limit(MAX_ROWS)
        .lean(),
      ActivityModel.find({ organizationId, ...nonFinancialActivity })
        .select("actorUserId entityType entityId action metadata occurredAt")
        .sort({ occurredAt: -1 })
        .limit(MAX_ROWS)
        .lean(),
      getMongoDb().then((db) =>
        db
          .collection("organization")
          .findOne({ id: organizationId }, { projection: { name: 1 } }),
      ),
    ]);

  const projectStatuses = (projects[0]?.statuses ?? []) as {
    _id: string;
    count: number;
  }[];
  const taskStatuses = (tasks[0]?.statuses ?? []) as {
    _id: string;
    count: number;
  }[];
  const deadlineTasks = await TaskModel.find({
    ...baseActive,
    status: { $in: activeTaskStatuses },
    dueDate: { $lt: range.end },
  })
    .select("projectId title dueDate status priority")
    .sort({ dueDate: 1 })
    .limit(MAX_ROWS)
    .lean();
  const projectIds = [
    ...new Set(
      [...deadlineTasks, ...milestones].map((item) => item.projectId.toString()),
    ),
  ];
  const projectNames = await ProjectModel.find({
    organizationId,
    _id: { $in: projectIds },
  })
    .select("name")
    .lean();
  const deadlineProjects = await ProjectModel.find({
    organizationId,
    archivedAt: null,
    status: { $in: activeProjectStatuses },
    dueDate: { $lte: range.end },
  })
    .select("name dueDate status priority")
    .sort({ dueDate: 1 })
    .limit(MAX_ROWS)
    .lean();
  const nameByProject = new Map(
    projectNames.map((project) => [String(project._id), project.name]),
  );

  const activityRows = (
    activity as unknown as Array<{
      _id: { toString(): string };
      actorUserId: string;
      entityType: string;
      action: string;
      metadata?: { name?: unknown };
      occurredAt: Date;
    }>
  ).map((item) => ({
    id: item._id.toString(),
    actorUserId: item.actorUserId,
    entityType: item.entityType,
    action: item.action,
    occurredAt: item.occurredAt.toISOString(),
    label: typeof item.metadata?.name === "string" ? item.metadata.name : undefined,
  }));
  const common = {
    workspaceName: workspace?.name ?? null,
    range: {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      label: range.label,
      timezone,
    },
    canViewFinancials,
    kpis: {
      clients: clients.find((x) => x._id === "active")?.count ?? 0,
      archivedClients: clients.find((x) => x._id === "archived")?.count ?? 0,
      activeProjects: projectStatuses
        .filter((x) => activeProjectStatuses.includes(x._id))
        .reduce((sum, x) => sum + x.count, 0),
      completedProjects: projectStatuses.find((x) => x._id === "completed")?.count ?? 0,
      overdueTasks: tasks[0]?.overdue[0]?.count ?? 0,
    },
    projects: {
      statuses: projectStatuses.map((x) => ({ label: x._id, value: x.count })),
      priorities: (projects[0]?.priorities ?? []).map(
        (x: { _id: string; count: number }) => ({ label: x._id, value: x.count }),
      ),
      budgets: (projects[0]?.budgets ?? []).map(
        (x: { _id: string; amountMinor: number }) => ({
          currency: x._id,
          amountMinor: x.amountMinor,
        }),
      ),
    },
    clientReport: clientProjects.map(
      (item: {
        _id: { toString(): string };
        projectCount: number;
        client?: { name?: string; companyName?: string };
      }) => ({
        clientId: item._id.toString(),
        name: item.client?.companyName || item.client?.name || "Archived client",
        projectCount: item.projectCount,
      }),
    ),
    tasks: { statuses: taskStatuses.map((x) => ({ label: x._id, value: x.count })) },
    deadlines: [
      ...deadlineTasks.map((item) => ({
        id: item._id.toString(),
        type: "task",
        projectId: item.projectId.toString(),
        projectName: nameByProject.get(item.projectId.toString()) ?? "Project",
        title: item.title,
        dueDate: item.dueDate?.toISOString() ?? null,
        status: item.status,
        priority: item.priority,
        isOverdue: item.dueDate ? item.dueDate.getTime() < now.getTime() : false,
      })),
      ...milestones.map((item) => ({
        id: item._id.toString(),
        type: "milestone",
        projectId: item.projectId.toString(),
        projectName: nameByProject.get(item.projectId.toString()) ?? "Project",
        title: item.title,
        dueDate: item.dueDate.toISOString(),
        status: item.status,
        priority: null,
        isOverdue: item.dueDate.getTime() < now.getTime(),
      })),
      ...deadlineProjects.map((item) => ({
        id: item._id.toString(),
        type: "project",
        projectId: item._id.toString(),
        projectName: item.name,
        title: item.name,
        dueDate: item.dueDate?.toISOString() ?? null,
        status: item.status,
        priority: item.priority,
        isOverdue: item.dueDate ? item.dueDate.getTime() < now.getTime() : false,
      })),
    ]
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
      .slice(0, MAX_ROWS),
    activity: activityRows,
  };

  if (!canViewFinancials) return common;
  const paymentMatch = successfulPaymentMatch(organizationId, range.start, range.end);
  const previousMatch = successfulPaymentMatch(
    organizationId,
    range.previousStart,
    range.previousEnd,
  );
  const [revenue, previousRevenue, series, invoices, recentPayments, pendingPayments] =
    await Promise.all([
      currencyTotals(paymentMatch),
      currencyTotals(previousMatch),
      PaymentModel.aggregate([
        { $match: paymentMatch },
        {
          $group: {
            _id: {
              period: {
                $dateToString: { date: "$paymentDate", format: grouping, timezone },
              },
              currency: "$currency",
            },
            amountMinor: { $sum: "$amountMinor" },
          },
        },
        {
          $project: {
            _id: 0,
            period: "$_id.period",
            currency: "$_id.currency",
            amountMinor: 1,
          },
        },
        { $sort: { period: 1, currency: 1 } },
      ]),
      InvoiceModel.find({ organizationId, archivedAt: null })
        .select(
          "_id invoiceNumber clientSnapshot issueDate dueDate totalMinor amountDueMinor amountPaidMinor currency minorUnit status",
        )
        .sort({ issueDate: -1 })
        .limit(30)
        .lean(),
      PaymentModel.find({ organizationId, status: "successful" })
        .select("_id invoiceId amountMinor currency minorUnit paymentDate paymentMethod")
        .sort({ paymentDate: -1 })
        .limit(MAX_ROWS)
        .lean(),
      PaymentModel.find({ organizationId, status: "pending" })
        .select("_id invoiceId amountMinor currency minorUnit paymentDate paymentMethod")
        .sort({ paymentDate: -1 })
        .limit(MAX_ROWS)
        .lean(),
    ]);
  const validInvoices = invoices.filter(
    (invoice) => invoice.status !== "void" && invoice.status !== "draft",
  );
  const outstanding = validInvoices.filter((invoice) => invoice.amountDueMinor > 0);
  const overdue = outstanding.filter((invoice) => invoice.dueDate < now);
  const invoiceRow = (invoice: (typeof invoices)[number]) => ({
    id: invoice._id.toString(),
    invoiceNumber: invoice.invoiceNumber,
    client:
      invoice.clientSnapshot?.companyName || invoice.clientSnapshot?.name || "Client",
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    totalMinor: invoice.totalMinor,
    amountDueMinor: invoice.amountDueMinor,
    amountPaidMinor: invoice.amountPaidMinor,
    currency: invoice.currency,
    minorUnit: invoice.minorUnit,
    status:
      invoice.dueDate < now && invoice.amountDueMinor > 0 ? "overdue" : invoice.status,
  });
  return {
    ...common,
    financial: {
      revenue,
      previousRevenue,
      series,
      overdueCount: overdue.length,
      outstanding: outstanding.reduce(
        (map, invoice) => {
          map[invoice.currency] = (map[invoice.currency] ?? 0) + invoice.amountDueMinor;
          return map;
        },
        {} as Record<string, number>,
      ),
      overdue: overdue.reduce(
        (map, invoice) => {
          map[invoice.currency] = (map[invoice.currency] ?? 0) + invoice.amountDueMinor;
          return map;
        },
        {} as Record<string, number>,
      ),
      invoices: {
        outstanding: outstanding.slice(0, MAX_ROWS).map(invoiceRow),
        overdue: overdue.slice(0, MAX_ROWS).map(invoiceRow),
        recent: validInvoices.slice(0, MAX_ROWS).map(invoiceRow),
        partial: outstanding
          .filter((invoice) => invoice.amountPaidMinor > 0)
          .slice(0, MAX_ROWS)
          .map(invoiceRow),
      },
      payments: recentPayments.map((payment) => ({
        id: payment._id.toString(),
        invoiceId: payment.invoiceId.toString(),
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        minorUnit: payment.minorUnit,
        paymentDate: payment.paymentDate.toISOString(),
        paymentMethod: payment.paymentMethod,
      })),
      pendingPayments: pendingPayments.map((payment) => ({
        id: payment._id.toString(),
        invoiceId: payment.invoiceId.toString(),
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        minorUnit: payment.minorUnit,
        paymentDate: payment.paymentDate.toISOString(),
        paymentMethod: payment.paymentMethod,
      })),
    },
  };
}
