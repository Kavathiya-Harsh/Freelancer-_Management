import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Globe,
  Sparkles,
  Users,
  Briefcase,
  FileText,
  DollarSign,
  PieChart,
  Layers,
  Star,
  Check,
  X,
} from "lucide-react";
import { HeroPreview } from "@/components/landing/hero-preview";
import { FeatureTabs } from "@/components/landing/feature-tabs";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { BrandLogo } from "@/components/ui/brand-logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0C211A] text-white selection:bg-lime-300 selection:text-[#102B22]">
      {/* Top Announcement Bar */}
      <div className="relative z-50 border-b border-lime-300/20 bg-lime-400/10 px-4 py-2 text-center text-xs font-medium text-lime-200">
        <span>🎉 FreelanceFlow 2.0 is live with automated multi-currency invoicing and deliverable review pipelines.</span>{" "}
        <Link href="/sign-in" className="inline-flex items-center gap-1 font-bold text-lime-300 underline hover:text-white">
          Explore the live interactive demo &rarr;
        </Link>
      </div>

      {/* Sticky Global Navigation */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0C211A]/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/">
            <BrandLogo size="md" subtitle="Operating System" theme="dark" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-8 md:flex text-sm font-medium text-emerald-100/75">
            <a href="#features" className="transition hover:text-lime-300">Features</a>
            <a href="#how-it-works" className="transition hover:text-lime-300">How It Works</a>
            <a href="#comparison" className="transition hover:text-lime-300">Comparison</a>
            <a href="#pricing" className="transition hover:text-lime-300">Pricing</a>
            <a href="#faq" className="transition hover:text-lime-300">FAQ</a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:text-lime-300"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-1.5 rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-bold text-[#102B22] shadow-md transition hover:bg-lime-200"
            >
              <span>Get started free</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-32">
        {/* Subtle Background Glows */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[1000px] h-[550px] bg-[radial-gradient(ellipse_at_top,_rgba(190,242,100,0.18),_transparent_65%)]" />
        <div className="pointer-events-none absolute right-0 top-1/3 h-96 w-96 rounded-full bg-emerald-600/10 blur-3xl" />
        <div className="pointer-events-none absolute left-0 bottom-10 h-96 w-96 rounded-full bg-lime-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 text-center lg:px-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-lime-300 shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            <span>The All-in-One Freelancer Operating System</span>
          </div>

          {/* Main Headline */}
          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Run your entire freelance business with{" "}
            <span className="bg-gradient-to-r from-lime-200 via-lime-300 to-emerald-400 bg-clip-text text-transparent">
              absolute clarity.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-emerald-100/80 sm:text-xl">
            Ditch the chaos of spreadsheets, WhatsApp messages, and clunky billing apps.
            Manage high-value clients, track multi-stage projects, and get paid 2x faster in one calm workspace.
          </p>

          {/* Dual CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-2xl bg-lime-300 px-7 py-4 text-base font-bold text-[#102B22] shadow-xl shadow-lime-300/20 transition hover:scale-105 hover:bg-lime-200"
            >
              <span>Start your free workspace</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/[0.05] px-7 py-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              <span>Explore live demo</span>
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-emerald-200/70 sm:gap-8">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-lime-300" />
              <span>Zero credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-lime-300" />
              <span>End-to-end encrypted workspaces</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-lime-300" />
              <span>Multi-currency & custom tax support</span>
            </div>
          </div>

          {/* Interactive Live Dashboard Preview */}
          <HeroPreview />
        </div>
      </section>

      {/* Social Proof & Metrics Strip */}
      <section className="relative border-y border-white/10 bg-white/[0.02] py-14">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
            <div>
              <p className="text-3xl font-extrabold text-lime-300 sm:text-4xl">$12M+</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-emerald-100/70">Invoiced By Users</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-lime-300 sm:text-4xl">99.8%</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-emerald-100/70">Milestone Success Rate</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-lime-300 sm:text-4xl">4.9 / 5</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-emerald-100/70">From 850+ Contractors</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-lime-300 sm:text-4xl">45%</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-emerald-100/70">Less Administrative Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Feature Overview */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-lime-300">
              Complete Business Suite
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Engineered for the demands of high-rate freelancing.
            </h2>
            <p className="mt-4 text-base leading-7 text-emerald-100/75">
              Everything works in seamless harmony. When a milestone completes, deliverables can be verified and invoiced in a single click.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1 */}
            <div className="group rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur transition hover:border-lime-300/40 hover:bg-white/[0.06]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-[#102B22] shadow">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Client Management Hub</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">
                Organize company contacts, ongoing agreements, hourly rates, and billing currencies. Keep every conversation and historical project visible.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur transition hover:border-lime-300/40 hover:bg-white/[0.06]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-[#102B22] shadow">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Project & Milestone Engine</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">
                Structure large scopes into clear, sequential milestones. Track completion percentages and secure stakeholder sign-off on each phase.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur transition hover:border-lime-300/40 hover:bg-white/[0.06]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-[#102B22] shadow">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Agile Kanban Task Boards</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">
                Drag-and-drop task planning with priority tags, assignee dispatches, deadline alerts, and automatic progress rollup into projects.
              </p>
            </div>

            {/* Card 4 */}
            <div className="group rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur transition hover:border-lime-300/40 hover:bg-white/[0.06]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-[#102B22] shadow">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Deliverable Approval Pipeline</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">
                Give clients an explicit review and approval stage. Prevent endless unpaid revision cycles with formal review checkpoints and file logs.
              </p>
            </div>

            {/* Card 5 */}
            <div className="group rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur transition hover:border-lime-300/40 hover:bg-white/[0.06]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-[#102B22] shadow">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Instant Professional Invoicing</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">
                Generate branded PDF invoices in seconds. Support multi-currency conversions, automated tax calculation, and payment status tracking.
              </p>
            </div>

            {/* Card 6 */}
            <div className="group rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur transition hover:border-lime-300/40 hover:bg-white/[0.06]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-[#102B22] shadow">
                <PieChart className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Executive Cashflow Analytics</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">
                Actionable business intelligence showing revenue pacing, overdue receivables, top-paying clients, and exportable financial summaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Workflow Deep Dive Tabs */}
      <FeatureTabs />

      {/* How It Works Section */}
      <section id="how-it-works" className="relative border-t border-white/10 bg-white/[0.02] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-lime-300">
              Simple 3-Step Flow
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              From lead to paid in record time.
            </h2>
            <p className="mt-4 text-base leading-7 text-emerald-100/75">
              FreelanceFlow replaces chaos with a frictionless pipeline designed to protect your time and earnings.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur">
              <span className="text-5xl font-black text-lime-300/20">01</span>
              <h3 className="mt-4 text-xl font-bold text-white">Set Up Your Workspace</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">
                Create an isolated workspace in 30 seconds. Choose your preferred currency, tax rules, and invoice prefixes.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur">
              <span className="text-5xl font-black text-lime-300/20">02</span>
              <h3 className="mt-4 text-xl font-bold text-white">Run Milestones & Tasks</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">
                Onboard clients, schedule milestone sprints, and attach deliverables for client approval with zero back-and-forth friction.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur">
              <span className="text-5xl font-black text-lime-300/20">03</span>
              <h3 className="mt-4 text-xl font-bold text-white">Invoice & Collect Payment</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">
                Generate professional PDF invoices with one click. Track payments in real-time and maintain full accounting clarity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section (Old Way vs FreelanceFlow) */}
      <section id="comparison" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-lime-300">
              The Modern Advantage
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Why independent pros are switching.
            </h2>
            <p className="mt-4 text-base leading-7 text-emerald-100/75">
              Stop juggling 5 different apps and unorganized WhatsApp threads.
            </p>
          </div>

          <div className="mt-16 overflow-hidden rounded-3xl border border-white/15 bg-white/[0.03] backdrop-blur-xl">
            <div className="grid grid-cols-1 divide-y divide-white/10 md:grid-cols-2 md:divide-x md:divide-y-0">
              {/* Old Way */}
              <div className="p-8 sm:p-12">
                <div className="flex items-center gap-2 text-red-400">
                  <X className="h-6 w-6" />
                  <h3 className="text-xl font-bold">The Fragmented Way</h3>
                </div>
                <ul className="mt-6 space-y-4 text-sm text-emerald-100/70">
                  <li className="flex items-start gap-3">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <span>Spreadsheets that go out of date the minute a client asks for a revision.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <span>Chasing deliverables and feedback across Slack, WhatsApp, and email threads.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <span>Invoices generated in Word or Canva with zero tracking when payments arrive.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <span>No visibility into overall monthly cashflow or overdue client liabilities.</span>
                  </li>
                </ul>
              </div>

              {/* FreelanceFlow Way */}
              <div className="bg-lime-300/[0.04] p-8 sm:p-12">
                <div className="flex items-center gap-2 text-lime-300">
                  <Check className="h-6 w-6" />
                  <h3 className="text-xl font-bold">The FreelanceFlow Way</h3>
                </div>
                <ul className="mt-6 space-y-4 text-sm text-white">
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
                    <span>Single source of truth linking every client to their projects, tasks, and bills.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
                    <span>Built-in deliverable review pipeline with explicit client approvals.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
                    <span>One-click PDF invoices with automatic status updates (Draft, Sent, Paid, Overdue).</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
                    <span>Executive financial charts that make tax preparation and forecasting effortless.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials (Wall of Love) */}
      <section className="relative border-t border-white/10 bg-white/[0.02] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-lime-300">
              Trusted Worldwide
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Built for pros who take their work seriously.
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                quote:
                  "FreelanceFlow completely transformed how I run my design business. The deliverable sign-off feature alone eliminated endless unpaid revision loops. Clients take me far more seriously.",
                author: "Sarah Chen",
                role: "Senior Product Designer & Consultant",
                avatar: "SC",
              },
              {
                quote:
                  "I was losing hundreds of dollars every month forgetting to invoice minor tasks. Now everything flows straight from milestone completion into a clean PDF invoice. It paid for itself on day one.",
                author: "Marcus Vance",
                role: "Full-Stack Contract Engineer",
                avatar: "MV",
              },
              {
                quote:
                  "Having clients, projects, invoices, and revenue reports under one roof has restored total peace of mind to my freelance agency. It's clean, fast, and doesn't get in your way.",
                author: "Elena Rostova",
                role: "Creative Director, Studio Echo",
                avatar: "ER",
              },
            ].map((t) => (
              <div
                key={t.author}
                className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur"
              >
                <div>
                  <div className="flex gap-1 text-lime-300">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-lime-300" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-emerald-100/80">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300 font-bold text-[#102B22]">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{t.author}</p>
                    <p className="text-xs text-emerald-200/60">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section Component */}
      <PricingSection />

      {/* FAQ Accordion Component */}
      <FaqSection />

      {/* High-Impact Bottom Call-to-Action */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(190,242,100,0.12),_transparent_70%)]" />

        <div className="relative mx-auto max-w-5xl px-6 text-center lg:px-8">
          <div className="rounded-3xl border border-lime-300/30 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-10 shadow-2xl backdrop-blur-2xl sm:p-16">
            <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Ready to operate your business like a pro?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-emerald-100/80 sm:text-lg">
              Join thousands of independent designers, developers, and consultants who save 10+ hours
              every week with FreelanceFlow.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-2xl bg-lime-300 px-8 py-4 text-base font-bold text-[#102B22] shadow-xl shadow-lime-300/25 transition hover:scale-105 hover:bg-lime-200"
              >
                <span>Create your workspace</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/sign-in"
                className="rounded-2xl border border-white/20 bg-white/[0.06] px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Sign in to demo
              </Link>
            </div>
            <p className="mt-5 text-xs text-emerald-200/60">
              No credit card required • Instant workspace setup in 30 seconds
            </p>
          </div>
        </div>
      </section>

      {/* SaaS Footer */}
      <footer className="border-t border-white/10 bg-[#081712] py-16 text-xs text-emerald-100/60">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
            <div className="col-span-2">
              <BrandLogo size="md" theme="dark" />
              <p className="mt-3 max-w-sm text-xs leading-relaxed text-emerald-100/70">
                The modern operating system for independent consultants, contractors, and boutique agencies.
                Built for clarity, speed, and profitability.
              </p>
              <div className="mt-4 flex items-center gap-2 text-lime-300">
                <span className="h-2 w-2 rounded-full bg-lime-300 animate-pulse" />
                <span className="font-medium">All systems operational</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white">Product</h4>
              <ul className="mt-3 space-y-2">
                <li><a href="#features" className="hover:text-white">Clients CRM</a></li>
                <li><a href="#features" className="hover:text-white">Milestones & Projects</a></li>
                <li><a href="#features" className="hover:text-white">Task Boards</a></li>
                <li><a href="#features" className="hover:text-white">Deliverables Pipeline</a></li>
                <li><a href="#features" className="hover:text-white">Invoicing & Payouts</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white">Resources</h4>
              <ul className="mt-3 space-y-2">
                <li><a href="#how-it-works" className="hover:text-white">How It Works</a></li>
                <li><a href="#comparison" className="hover:text-white">Vs Spreadsheets</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing Plans</a></li>
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
                <li><Link href="/sign-in" className="hover:text-white">Live Demo</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white">Security & Trust</h4>
              <ul className="mt-3 space-y-2">
                <li><span className="hover:text-white">Multi-tenant Isolation</span></li>
                <li><span className="hover:text-white">TLS 1.3 & Argon2</span></li>
                <li><span className="hover:text-white">Role-Based RBAC</span></li>
                <li><span className="hover:text-white">Data Privacy Policy</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
            <p>© {new Date().getFullYear()} FreelanceFlow Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-white cursor-pointer">Privacy Policy</span>
              <span className="hover:text-white cursor-pointer">Terms of Service</span>
              <span className="hover:text-white cursor-pointer">Security Overview</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
