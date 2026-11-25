"use client";

import { useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
} from "lucide-react";

export function HeroPreview() {
  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "invoices">("overview");

  return (
    <div className="relative mx-auto mt-12 w-full max-w-5xl rounded-3xl border border-white/15 bg-white/[0.04] p-2.5 shadow-2xl backdrop-blur-xl sm:p-4">
      {/* Outer Glow */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-lime-400/20 to-teal-500/20 opacity-40 blur-xl transition-all duration-1000 group-hover:opacity-70" />

      {/* Window Header */}
      <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-400/80" />
          <div className="h-3 w-3 rounded-full bg-amber-400/80" />
          <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
          <span className="ml-3 hidden text-xs font-medium text-emerald-200/60 sm:inline-block">
            app.freelanceflow.dev/w/acme-studio/dashboard
          </span>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`rounded-lg px-3 py-1 font-medium transition ${
              activeTab === "overview"
                ? "bg-lime-300 text-[#102B22] shadow"
                : "text-emerald-100/70 hover:text-white"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("projects")}
            className={`rounded-lg px-3 py-1 font-medium transition ${
              activeTab === "projects"
                ? "bg-lime-300 text-[#102B22] shadow"
                : "text-emerald-100/70 hover:text-white"
            }`}
          >
            Active Projects
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("invoices")}
            className={`rounded-lg px-3 py-1 font-medium transition ${
              activeTab === "invoices"
                ? "bg-lime-300 text-[#102B22] shadow"
                : "text-emerald-100/70 hover:text-white"
            }`}
          >
            Recent Invoices
          </button>
        </div>
      </div>

      {/* Tab Content Display */}
      <div className="relative p-4 sm:p-6">
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* Top Stat Metrics */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex items-center justify-between text-xs text-emerald-200/70">
                  <span>Total Revenue (MTD)</span>
                  <DollarSign className="h-4 w-4 text-lime-300" />
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-white">$24,850.00</p>
                <div className="mt-1.5 flex items-center gap-1 text-xs text-lime-300">
                  <TrendingUp className="h-3 w-3" />
                  <span>+34.2% vs last month</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex items-center justify-between text-xs text-emerald-200/70">
                  <span>Active Clients</span>
                  <Users className="h-4 w-4 text-emerald-300" />
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-white">14</p>
                <p className="mt-1.5 text-xs text-emerald-200/60">3 onboarded this week</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex items-center justify-between text-xs text-emerald-200/70">
                  <span>Ongoing Projects</span>
                  <Briefcase className="h-4 w-4 text-cyan-300" />
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-white">9</p>
                <p className="mt-1.5 text-xs text-emerald-200/60">85% milestones delivered</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex items-center justify-between text-xs text-emerald-200/70">
                  <span>Pending Payouts</span>
                  <Clock className="h-4 w-4 text-amber-300" />
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-white">$6,400.00</p>
                <p className="mt-1.5 text-xs text-emerald-200/60">Expected within 5 days</p>
              </div>
            </div>

            {/* Bottom Split: Projects & Activity */}
            <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Priority Projects Pacing</h4>
                  <span className="text-xs text-lime-300 font-medium">All On Track</span>
                </div>
                <div className="mt-4 space-y-3.5">
                  {[
                    { name: "Fintech Mobile App Redesign", client: "Apex Capital", progress: 88, budget: "$12,500" },
                    { name: "Design System & Tokens", client: "Linear Global", progress: 65, budget: "$8,200" },
                    { name: "AI Analytics Landing & Brand", client: "Pulse AI", progress: 42, budget: "$6,500" },
                  ].map((proj) => (
                    <div key={proj.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-emerald-100">{proj.name}</span>
                        <span className="text-emerald-200/70">{proj.budget} • {proj.progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300"
                          style={{ width: `${proj.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Live Activity</h4>
                  <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
                </div>
                <div className="mt-3.5 space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
                    <div>
                      <p className="text-white font-medium">Invoice #INV-2024-08 Paid</p>
                      <p className="text-emerald-200/60">$4,250.00 collected from Apex Capital</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                    <div>
                      <p className="text-white font-medium">Deliverable Approved</p>
                      <p className="text-emerald-200/60">Final Figma UI prototype approved by client</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <div>
                      <p className="text-white font-medium">Milestone 2 Completed</p>
                      <p className="text-emerald-200/60">Linear Global sprint marked ready for review</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "projects" && (
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "SaaS Brand Identity & Web",
                client: "Nexus Cloud",
                milestones: "4 of 5 complete",
                due: "Nov 30, 2026",
                amount: "$9,400",
                status: "In Progress",
              },
              {
                title: "E-Commerce Checkout Flow",
                client: "Kira Fashion",
                milestones: "3 of 3 complete",
                due: "Dec 12, 2026",
                amount: "$7,200",
                status: "Client Review",
              },
              {
                title: "Enterprise Design System",
                client: "Vektor Labs",
                milestones: "2 of 6 complete",
                due: "Jan 15, 2027",
                amount: "$16,500",
                status: "In Progress",
              },
            ].map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-xs transition hover:border-lime-300/40"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-lime-300/20 px-2.5 py-0.5 text-[11px] font-semibold text-lime-300">
                    {p.status}
                  </span>
                  <span className="font-bold text-white text-sm">{p.amount}</span>
                </div>
                <h5 className="mt-3 text-sm font-semibold text-white">{p.title}</h5>
                <p className="mt-1 text-emerald-200/70">{p.client}</p>
                <div className="mt-4 border-t border-white/10 pt-3 flex justify-between text-emerald-200/60">
                  <span>{p.milestones}</span>
                  <span>Due {p.due}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-emerald-200/60">
                  <th className="pb-3 font-medium">Invoice #</th>
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Due Date</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white">
                <tr>
                  <td className="py-3 font-semibold text-lime-300">INV-2026-042</td>
                  <td className="py-3">Apex Capital Partners</td>
                  <td className="py-3 text-emerald-200/70">Nov 28, 2026</td>
                  <td className="py-3 font-semibold">$5,200.00</td>
                  <td className="py-3">
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                      Paid
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-lime-300">INV-2026-041</td>
                  <td className="py-3">Linear Global Inc.</td>
                  <td className="py-3 text-emerald-200/70">Dec 04, 2026</td>
                  <td className="py-3 font-semibold">$3,850.00</td>
                  <td className="py-3">
                    <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                      Pending
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-lime-300">INV-2026-040</td>
                  <td className="py-3">Pulse AI Studio</td>
                  <td className="py-3 text-emerald-200/70">Nov 15, 2026</td>
                  <td className="py-3 font-semibold">$6,400.00</td>
                  <td className="py-3">
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                      Paid
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
