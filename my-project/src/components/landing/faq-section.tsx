"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "How is FreelanceFlow different from Notion, Trello, or spreadsheets?",
    a: "Unlike generic productivity tools, FreelanceFlow is purpose-built as an end-to-end Freelancer Operating System. It connects your clients directly to your project milestones, your tasks to deliverables, and your deliverables to automated invoices. You never have to copy-paste client details or chase status across 5 fragmented tabs.",
  },
  {
    q: "Can I try FreelanceFlow before committing or adding my credit card?",
    a: "Yes! FreelanceFlow requires zero credit card to start. You can also explore our fully preloaded live interactive demo workspace with one click to see how projects, invoices, and analytics look with real client data.",
  },
  {
    q: "Does FreelanceFlow support international currencies?",
    a: "Yes. Each workspace can configure its primary currency (USD, EUR, GBP, CAD, AUD, and more) as well as localized invoice number sequencing and custom invoice prefixes (e.g. INV-2026-).",
  },
  {
    q: "How does the Deliverable Review & Approval flow work?",
    a: "When you finish an asset (design prototype, code release, copy draft), you submit it as a Deliverable under its respective project. Clients can view, download, request revisions, or mark it officially approved, creating a crystal-clear audit trail before you issue the final invoice.",
  },
  {
    q: "Can I invite team members or subcontractors into my workspace?",
    a: "Absolutely. FreelanceFlow supports role-based access control with Owners, Admins, and Members. You can assign specific tasks to subcontractors while keeping client financial totals and sensitive invoices confidential.",
  },
  {
    q: "Is my client and financial data secure?",
    a: "We adhere to enterprise-grade data protection standards. All connections are secured with TLS 1.3, sensitive tokens are cryptographically hashed using SHA-256 and Argon2, and each workspace is isolated with strict multi-tenant authorization guards.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[.22em] text-lime-300">
            Got Questions?
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-emerald-100/70">
            Everything you need to know about setting up your workspace, managing clients, and billing.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.q}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur transition hover:border-white/20"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left font-semibold text-white sm:p-6"
                >
                  <span className="text-base sm:text-lg">{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-lime-300 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-white/10 px-5 pb-6 pt-4 sm:px-6">
                    <p className="text-sm leading-relaxed text-emerald-100/80 sm:text-base">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
