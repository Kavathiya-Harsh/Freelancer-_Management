"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

export function PricingSection() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[.22em] text-lime-300">
            Transparent, Honest Pricing
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Predictable plans that scale with your craft.
          </h2>
          <p className="mt-4 text-base leading-7 text-emerald-100/75">
            Start free with full core features. Upgrade whenever you&apos;re ready to automate reminders,
            invite subcontractors, or unlock multi-workspace isolation.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm ${!annual ? "font-semibold text-white" : "text-emerald-100/60"}`}>
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={annual}
              onClick={() => setAnnual(!annual)}
              className="relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-white/20 p-0.5 transition-colors duration-200 ease-in-out focus:outline-none"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-lime-300 shadow transition duration-200 ease-in-out ${
                  annual ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-sm ${annual ? "font-semibold text-white" : "text-emerald-100/60"}`}>
              Yearly <span className="ml-1 rounded-full bg-lime-300/20 px-2 py-0.5 text-xs font-bold text-lime-300">Save 20%</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
          {/* Starter Plan */}
          <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-lg transition hover:border-white/25">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Starter</h3>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-200">
                  Solo Free
                </span>
              </div>
              <p className="mt-4 text-sm text-emerald-100/70">
                Essential operating tools for individual contractors and beginner freelancers.
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-white">$0</span>
                <span className="text-sm font-medium text-emerald-100/60">/ forever</span>
              </div>

              <ul className="mt-8 space-y-3.5 text-sm text-emerald-100/80">
                {[
                  "Up to 3 active projects",
                  "Unlimited client profiles",
                  "Basic task Kanban boards",
                  "Standard PDF invoice creation",
                  "Manual payment logging",
                  "Email support",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-4 w-4 shrink-0 text-lime-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/sign-up"
              className="mt-8 block w-full rounded-xl border border-white/20 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
            >
              Get started free
            </Link>
          </div>

          {/* Pro Plan (Highlighted) */}
          <div className="relative flex flex-col justify-between rounded-3xl border-2 border-lime-300 bg-gradient-to-b from-white/[0.09] to-white/[0.03] p-8 shadow-2xl backdrop-blur-xl">
            <div className="absolute -top-4 right-8 rounded-full bg-lime-300 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#102B22] shadow">
              Most Popular
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Professional</h3>
                <Sparkles className="h-5 w-5 text-lime-300" />
              </div>
              <p className="mt-4 text-sm text-emerald-100/70">
                Designed for full-time independents, senior consultants, and boutique specialists.
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-white">
                  ${annual ? "16" : "20"}
                </span>
                <span className="text-sm font-medium text-emerald-100/60">/ month</span>
              </div>

              <ul className="mt-8 space-y-3.5 text-sm text-emerald-100/90">
                {[
                  "Unlimited active projects & milestones",
                  "Deliverable client review & approval pipeline",
                  "Automated overdue payment reminders",
                  "Custom invoice prefix & sequence control",
                  "Multi-currency support (USD, EUR, GBP, CAD)",
                  "Executive analytics & cashflow breakdown",
                  "Exportable reports (CSV, PDF summary)",
                  "Priority email & chat assistance",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-4 w-4 shrink-0 text-lime-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/sign-up"
              className="mt-8 block w-full rounded-xl bg-lime-300 py-3 text-center text-sm font-bold text-[#102B22] shadow-lg transition hover:bg-lime-200"
            >
              Start 14-day free trial
            </Link>
          </div>

          {/* Studio / Agency Plan */}
          <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-lg transition hover:border-white/25">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Studio & Agency</h3>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-200">
                  Teams
                </span>
              </div>
              <p className="mt-4 text-sm text-emerald-100/70">
                For creative partners, development collectives, and micro-agencies managing multiple seats.
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-white">
                  ${annual ? "39" : "49"}
                </span>
                <span className="text-sm font-medium text-emerald-100/60">/ month</span>
              </div>

              <ul className="mt-8 space-y-3.5 text-sm text-emerald-100/80">
                {[
                  "Everything in Professional",
                  "Up to 5 team collaborator seats",
                  "Role-based access (Owner, Admin, Member)",
                  "Multi-workspace organization switching",
                  "Custom workspace domains & branding",
                  "Dedicated account review",
                  "99.9% uptime SLA guarantee",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-4 w-4 shrink-0 text-lime-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/sign-up"
              className="mt-8 block w-full rounded-xl border border-white/20 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
            >
              Launch your studio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
