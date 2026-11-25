"use client";

import { useState } from "react";
import {
  Users,
  Target,
  CheckCircle,
  Receipt,
  PieChart,
} from "lucide-react";

const WORKFLOWS = [
  {
    id: "clients",
    label: "Client Relationship CRM",
    icon: Users,
    badge: "360° Client Clarity",
    title: "Never lose track of a client agreement, rate, or history.",
    description:
      "Maintain a unified dossier for every client you serve. Track contract terms, standard hourly/fixed rates, contact emails, active project allocations, and complete payment history in one calm view.",
    highlights: [
      "Custom billing contact & company profiles",
      "Lifetime value (LTV) and total revenue analytics",
      "One-click client workspace isolation",
      "Instant client status filtering (Active, Lead, Inactive)",
    ],
    metric: { value: "3.2x", label: "Faster client onboarding" },
  },
  {
    id: "projects",
    label: "Milestones & Projects",
    icon: Target,
    badge: "Milestone Pacing",
    title: "Break massive client scopes into profitable, step-by-step milestones.",
    description:
      "Avoid scope creep and project delays. Define milestones, attach deliverables, track percentage completion, and lock milestone payouts before moving to the next sprint.",
    highlights: [
      "Budget vs actual expenditure tracking",
      "Granular milestone deadlines & sign-offs",
      "Subcontractor and assignee workload assignment",
      "Integrated status logs and project activity feed",
    ],
    metric: { value: "98.5%", label: "On-time milestone delivery" },
  },
  {
    id: "invoices",
    label: "Invoicing & Payments",
    icon: Receipt,
    badge: "Automated Billing",
    title: "Issue client-ready PDF invoices and get paid without the awkward chase.",
    description:
      "Convert completed milestones and tasks into clean, professional invoices in seconds. Track real-time status from draft to issued, paid, or overdue with automated balance calculations.",
    highlights: [
      "Auto-generated PDF downloads with your logo & prefix",
      "Multi-currency support with dynamic tax & discount rows",
      "Partial and milestone-based payment logging",
      "Audited payment logs with receipt reconciliation",
    ],
    metric: { value: "12 Days", label: "Faster average invoice collection" },
  },
  {
    id: "deliverables",
    label: "Deliverables & Approvals",
    icon: CheckCircle,
    badge: "Client Sign-off",
    title: "A structured review pipeline that keeps stakeholders accountable.",
    description:
      "Stop chasing approvals across fragmented Slack messages and messy email threads. Clients review deliverables in context, post revision notes, and grant official sign-off.",
    highlights: [
      "Version tracking for designs, code releases & copy",
      "Explicit status badges: Draft, In Review, Approved",
      "Structured reviewer assignments and feedback comments",
      "Cryptographic file verification and audit log",
    ],
    metric: { value: "65%", label: "Fewer revision iterations" },
  },
  {
    id: "analytics",
    label: "Executive Analytics",
    icon: PieChart,
    badge: "Financial Intelligence",
    title: "Understand your cashflow, profit margins, and revenue pacing.",
    description:
      "Make confident business decisions with real-time financial reporting. See total invoiced amounts, collected cash, outstanding debts, and top revenue-generating clients.",
    highlights: [
      "Interactive 30-day, 90-day, and year-to-date ranges",
      "Overdue invoice risk analysis and aging alerts",
      "Exportable financial summaries for accounting & tax",
      "Calm visual charts designed for independent pros",
    ],
    metric: { value: "$12M+", label: "Invoiced across all active workspaces" },
  },
];

export function FeatureTabs() {
  const [activeId, setActiveId] = useState("clients");
  const current = WORKFLOWS.find((w) => w.id === activeId) || WORKFLOWS[0];
  const Icon = current.icon;

  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[.22em] text-lime-300">
            Engineered For Independents
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Everything your business needs to operate with authority.
          </h2>
          <p className="mt-4 text-base leading-7 text-emerald-100/75">
            Six cohesive modules working together under one roof. No plugins to buy, no APIs to glue,
            and no unexpected downtime.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          {WORKFLOWS.map((wf) => {
            const TabIcon = wf.icon;
            const isSelected = wf.id === activeId;
            return (
              <button
                key={wf.id}
                type="button"
                onClick={() => setActiveId(wf.id)}
                className={`flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                  isSelected
                    ? "bg-lime-300 text-[#102B22] shadow-lg shadow-lime-300/10"
                    : "border border-white/10 bg-white/[0.04] text-emerald-100/70 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <TabIcon className="h-4 w-4 shrink-0" />
                <span>{wf.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Workflow Showcase Card */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl sm:p-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-lime-300/15 px-3 py-1 text-xs font-semibold text-lime-300">
                <Icon className="h-3.5 w-3.5" />
                <span>{current.badge}</span>
              </div>
              <h3 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {current.title}
              </h3>
              <p className="mt-4 text-base leading-relaxed text-emerald-100/75">
                {current.description}
              </p>

              {/* Highlights Checkmarks */}
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {current.highlights.map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-xs text-emerald-100/90">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Metric Card */}
              <div className="mt-8 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="text-3xl font-extrabold text-lime-300">{current.metric.value}</div>
                <div className="text-xs text-emerald-100/70">{current.metric.label}</div>
              </div>
            </div>

            {/* Right Mock Card Display */}
            <div className="relative rounded-2xl border border-white/10 bg-[#0B2019]/90 p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300 font-bold text-[#102B22]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{current.label}</h4>
                    <p className="text-xs text-emerald-200/60">Live module preview</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                  Ready To Deploy
                </span>
              </div>

              <div className="mt-6 space-y-3.5">
                <div className="flex items-center justify-between rounded-xl bg-white/[0.04] p-3 text-xs">
                  <span className="text-emerald-100/80">Permission Access</span>
                  <span className="font-semibold text-white">Owner & Admin Protected</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/[0.04] p-3 text-xs">
                  <span className="text-emerald-100/80">Audit Trail</span>
                  <span className="font-semibold text-lime-300">Enabled (Immutable Logs)</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/[0.04] p-3 text-xs">
                  <span className="text-emerald-100/80">Real-time Multi-tenant Guard</span>
                  <span className="font-semibold text-white">Active (UUID + Slug)</span>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-lime-300/30 bg-lime-300/10 p-3.5 text-xs text-lime-200">
                <span className="font-bold">✨ Pro Tip:</span> All changes synchronize instantly across your team and client portals without page reloads.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
