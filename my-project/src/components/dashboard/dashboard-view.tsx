"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  RefreshCw,
  Users,
} from "lucide-react";
import { formatMoney } from "@/server/finance/currencies";

type DashboardData = {
  workspaceName: string | null;
  canViewFinancials: boolean;
  range: { label: string; timezone: string };
  kpis: {
    clients: number;
    archivedClients: number;
    activeProjects: number;
    completedProjects: number;
    overdueTasks: number;
  };
  projects: {
    statuses: { label: string; value: number }[];
    priorities: { label: string; value: number }[];
  };
  tasks: { statuses: { label: string; value: number }[] };
  deadlines: {
    id: string;
    type: string;
    projectId: string;
    projectName: string;
    title: string;
    dueDate: string | null;
    status: string;
    priority: string | null;
    isOverdue: boolean;
  }[];
  activity: {
    id: string;
    actorUserId: string;
    entityType: string;
    action: string;
    occurredAt: string;
    label?: string;
  }[];
  financial?: {
    revenue: { currency: string; amountMinor: number }[];
    previousRevenue: { currency: string; amountMinor: number }[];
    series: { period: string; currency: string; amountMinor: number }[];
    overdueCount: number;
    outstanding: Record<string, number>;
    overdue: Record<string, number>;
    invoices: {
      outstanding: Invoice[];
      overdue: Invoice[];
      recent: Invoice[];
      partial: Invoice[];
    };
    payments: Payment[];
    pendingPayments: Payment[];
  };
};
type Invoice = {
  id: string;
  invoiceNumber: string;
  client: string;
  issueDate: string;
  dueDate: string;
  totalMinor: number;
  amountDueMinor: number;
  amountPaidMinor: number;
  currency: string;
  minorUnit: number;
  status: string;
};
type Payment = {
  id: string;
  invoiceId: string;
  amountMinor: number;
  currency: string;
  minorUnit: number;
  paymentDate: string;
  paymentMethod: string;
};

const presets = [
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["this-month", "This month"],
  ["previous-month", "Previous month"],
  ["90d", "Last 90 days"],
  ["this-year", "This year"],
  ["custom", "Custom range"],
] as const;
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value))
    : "No date";
const title = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

function currencyList(values: Record<string, number>) {
  const items = Object.entries(values);
  return items.length
    ? items.map(([currency, amount]) => formatMoney(amount, currency)).join(" · ")
    : "None";
}

function Kpi({
  label,
  value,
  icon: Icon,
  detail,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  detail?: string;
}) {
  return (
    <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#55705d]">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#123524]">{value}</p>
          {detail && <p className="mt-2 text-xs text-[#6b8171]">{detail}</p>}
        </div>
        <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
          <Icon size={19} />
        </span>
      </div>
    </article>
  );
}

function Distribution({
  title: heading,
  values,
}: {
  title: string;
  values: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...values.map((item) => item.value));
  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-[#123524]">{heading}</h2>
      <div className="mt-5 space-y-3">
        {values.length ? (
          values.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-[#55705d]">{title(item.label)}</span>
                <span className="font-semibold text-[#123524]">{item.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-emerald-50">
                <div
                  className="h-full rounded-full bg-teal-500"
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-[#6b8171]">No records yet.</p>
        )}
      </div>
    </section>
  );
}

function RevenueChart({
  series,
}: {
  series: NonNullable<DashboardData["financial"]>["series"];
}) {
  const periods = [...new Set(series.map((item) => item.period))];
  const currencies = [...new Set(series.map((item) => item.currency))];
  const max = Math.max(1, ...series.map((item) => item.amountMinor));
  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-[#123524]">Received revenue</h2>
          <p className="mt-1 text-xs text-[#6b8171]">
            Successful payments only; currencies stay separate.
          </p>
        </div>
        <BarChart3 className="text-teal-600" />
      </div>
      {periods.length ? (
        <div className="mt-6 space-y-4">
          {currencies.map((currency) => (
            <div key={currency}>
              <p className="mb-2 text-xs font-semibold text-[#55705d]">{currency}</p>
              <div className="flex h-28 items-end gap-2">
                {periods.map((period) => {
                  const total =
                    series.find(
                      (item) => item.period === period && item.currency === currency,
                    )?.amountMinor ?? 0;
                  return (
                    <div
                      className="group flex min-w-0 flex-1 flex-col justify-end"
                      key={period}
                    >
                      <div
                        title={`${period}: ${total} ${currency} minor units`}
                        className="min-h-1 rounded-t bg-teal-500 transition-all group-hover:bg-emerald-600"
                        style={{
                          height: `${Math.max(total ? 5 : 0, (total / max) * 100)}%`,
                        }}
                      />
                      <span className="mt-2 truncate text-center text-[10px] text-[#6b8171]">
                        {period.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-14 text-center text-sm text-[#6b8171]">
          No successful payments in this period.
        </p>
      )}
    </section>
  );
}

function InvoiceRows({ title: heading, items }: { title: string; items: Invoice[] }) {
  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-[#123524]">{heading}</h2>
      {items.length ? (
        <div className="mt-4 divide-y divide-emerald-50">
          {items.map((item) => (
            <div
              className="flex items-center justify-between gap-4 py-3 hover:bg-emerald-50"
              key={item.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#123524]">
                  {item.invoiceNumber}
                </p>
                <p className="truncate text-xs text-[#6b8171]">
                  {item.client} · due {date(item.dueDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#123524]">
                  {formatMoney(item.amountDueMinor, item.currency, item.minorUnit)}
                </p>
                <p className="text-xs capitalize text-[#6b8171]">{item.status}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-sm text-[#6b8171]">No matching invoices.</p>
      )}
    </section>
  );
}

function PaymentRows({ title: heading, items }: { title: string; items: Payment[] }) {
  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-[#123524]">{heading}</h2>
      {items.length ? (
        <div className="mt-4 divide-y divide-emerald-50">
          {items.map((item) => (
            <div className="flex items-center justify-between gap-4 py-3" key={item.id}>
              <div>
                <p className="text-sm font-semibold text-[#123524]">
                  {title(item.paymentMethod)}
                </p>
                <p className="text-xs text-[#6b8171]">{date(item.paymentDate)}</p>
              </div>
              <p className="text-sm font-semibold text-[#123524]">
                {formatMoney(item.amountMinor, item.currency, item.minorUnit)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-sm text-[#6b8171]">No matching payments.</p>
      )}
    </section>
  );
}

export function DashboardView({
  workspaceSlug,
  userName,
  reports = false,
}: {
  workspaceSlug: string;
  userName?: string | null;
  reports?: boolean;
}) {
  const [preset, setPreset] = useState("30d");
  const [data, setData] = useState<DashboardData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const requestVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ preset });
      if (preset === "custom") {
        if (!customStart || !customEnd) {
          throw new Error("Choose both dates for a custom range.");
        }
        query.set("start", customStart);
        query.set("end", customEnd);
      }
      const response = await fetch(
        `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/${reports ? "reports" : "reports/overview"}?${query.toString()}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "Unable to load analytics.");
      if (version === requestVersion.current) setData(result.data);
    } catch (reason) {
      if (version === requestVersion.current) {
        setError(reason instanceof Error ? reason.message : "Unable to load analytics.");
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [workspaceSlug, preset, reports, customStart, customEnd]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const financial = data?.financial;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            {data?.workspaceName ?? "Workspace"}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#123524]">
            {reports
              ? "Business reports"
              : `Good to see you${userName ? `, ${userName}` : ""}`}
          </h1>
          <p className="mt-2 text-sm text-[#55705d]">
            {data?.range.label ?? "Loading date range…"}
            {data ? ` · ${data.range.timezone}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Date range"
            value={preset}
            onChange={(event) => setPreset(event.target.value)}
            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-[#123524]"
          >
            {presets.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
          {preset === "custom" && (
            <>
              <input
                aria-label="Custom range start"
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="rounded-xl border border-emerald-200 bg-white px-2 py-2 text-sm text-[#123524]"
              />
              <input
                aria-label="Custom range end (exclusive)"
                type="date"
                value={customEnd}
                min={customStart || undefined}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="rounded-xl border border-emerald-200 bg-white px-2 py-2 text-sm text-[#123524]"
              />
            </>
          )}
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          {data?.canViewFinancials && reports && (
            <a
              href={`/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/reports?${[
                `preset=${encodeURIComponent(preset)}`,
                preset === "custom" ? `start=${encodeURIComponent(customStart)}` : "",
                preset === "custom" ? `end=${encodeURIComponent(customEnd)}` : "",
                "format=csv",
                "report=revenue",
              ]
                .filter(Boolean)
                .join("&")}`}
              className="rounded-xl bg-lime-300 px-3 py-2 text-sm font-semibold text-[#123524]"
            >
              Export revenue CSV
            </a>
          )}
          <Link
            href={`/w/${workspaceSlug}/projects`}
            className="rounded-xl bg-[#123524] px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            Projects
          </Link>
          <Link
            href={`/w/${workspaceSlug}/clients`}
            className="rounded-xl bg-lime-300 px-3 py-2 text-sm font-semibold text-[#123524] hover:bg-lime-200"
          >
            Clients
          </Link>
        </div>
      </header>
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}{" "}
          <button className="ml-2 underline" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}
      {loading && !data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="h-32 animate-pulse rounded-2xl bg-emerald-100" key={i} />
          ))}
        </div>
      ) : (
        data && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Kpi
                label="Active clients"
                value={data.kpis.clients}
                detail={`${data.kpis.archivedClients} archived`}
                icon={Users}
              />
              <Kpi
                label="Active projects"
                value={data.kpis.activeProjects}
                detail={`${data.kpis.completedProjects} completed`}
                icon={ClipboardList}
              />
              <Kpi
                label="Overdue tasks"
                value={data.kpis.overdueTasks}
                icon={CalendarDays}
              />
              {financial && (
                <>
                  <Kpi
                    label="Payments received"
                    value={
                      financial.revenue.length
                        ? financial.revenue
                            .map((x) => formatMoney(x.amountMinor, x.currency))
                            .join(" · ")
                        : "None"
                    }
                    detail={
                      financial.previousRevenue.length
                        ? `Previous period: ${financial.previousRevenue
                            .map((x) => formatMoney(x.amountMinor, x.currency))
                            .join(" · ")}`
                        : "No previous-period data"
                    }
                    icon={CircleDollarSign}
                  />
                  <Kpi
                    label="Outstanding balance"
                    value={currencyList(financial.outstanding)}
                    icon={CircleDollarSign}
                  />
                  <Kpi
                    label="Overdue invoices"
                    value={financial.overdueCount}
                    detail={currencyList(financial.overdue)}
                    icon={CircleDollarSign}
                  />
                </>
              )}
            </div>
            {!data.canViewFinancials && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Financial totals, payments, and invoice details are restricted to
                workspace owners and admins.
              </div>
            )}
            {financial && (
              <div className="grid gap-4 lg:grid-cols-2">
                <RevenueChart series={financial.series} />
                <InvoiceRows
                  title="Outstanding invoices"
                  items={financial.invoices.outstanding}
                />
              </div>
            )}
            {financial && (
              <div className="grid gap-4 lg:grid-cols-2">
                <PaymentRows
                  title="Recent successful payments"
                  items={financial.payments}
                />
                <PaymentRows
                  title="Pending payment records"
                  items={financial.pendingPayments}
                />
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-3">
              <Distribution title="Projects by status" values={data.projects.statuses} />
              <Distribution title="Project priority" values={data.projects.priorities} />
              <Distribution title="Tasks by status" values={data.tasks.statuses} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-[#123524]">Upcoming work</h2>
                  <Link
                    href={`/w/${workspaceSlug}/tasks`}
                    className="text-xs font-semibold text-emerald-700"
                  >
                    Open tasks <ArrowUpRight className="inline" size={14} />
                  </Link>
                </div>
                {data.deadlines.length ? (
                  <div className="mt-3">
                    {(["Overdue", "Upcoming"] as const).map((group) => {
                      const items = data.deadlines.filter((item) =>
                        group === "Overdue" ? item.isOverdue : !item.isOverdue,
                      );
                      return (
                        <div key={group}>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#55705d]">
                            {group}
                          </p>
                          {items.length ? (
                            <div className="divide-y divide-emerald-50">
                              {items.map((item) => (
                                <Link
                                  href={`/w/${workspaceSlug}/projects/${item.projectId}`}
                                  key={`${item.type}-${item.id}`}
                                  className="flex justify-between gap-3 py-3 hover:bg-emerald-50"
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-[#123524]">
                                      {item.title}
                                    </p>
                                    <p className="text-xs text-[#6b8171]">
                                      {item.projectName} · {title(item.status)}
                                    </p>
                                  </div>
                                  <p className="shrink-0 text-xs font-medium text-[#55705d]">
                                    {date(item.dueDate)}
                                  </p>
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <p className="py-3 text-xs text-[#6b8171]">
                              No {group.toLowerCase()} work.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-6 text-sm text-[#6b8171]">
                    No unfinished upcoming work.
                  </p>
                )}
              </section>
              <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-[#123524]">Recent activity</h2>
                {data.activity.length ? (
                  <div className="mt-3 divide-y divide-emerald-50">
                    {data.activity.map((item) => (
                      <div className="py-3" key={item.id}>
                        <p className="text-sm text-[#123524]">
                          <span className="font-semibold">{title(item.entityType)}</span>{" "}
                          {title(item.action)}
                        </p>
                        <p className="mt-1 text-xs text-[#6b8171]">
                          {date(item.occurredAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-sm text-[#6b8171]">
                    No activity has been recorded.
                  </p>
                )}
              </section>
            </div>
            {financial && reports && (
              <div className="grid gap-4 lg:grid-cols-2">
                <InvoiceRows
                  title="Overdue invoices"
                  items={financial.invoices.overdue}
                />
                <InvoiceRows
                  title="Partially paid invoices"
                  items={financial.invoices.partial}
                />
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
