"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Receipt } from "lucide-react";
import { apiRequest } from "@/lib/api-client";

type InvoiceDetail = {
  _id: string;
  invoiceNumber: string;
  status: string;
  computedStatus: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  minorUnit: number;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  amountPaidMinor: number;
  amountDueMinor: number;
  lineItems: Array<{
    description: string;
    quantityMilli: number;
    unitAmountMinor: number;
    lineTotalMinor: number;
  }>;
  clientSnapshot?: { name?: string; companyName?: string; email?: string };
  notes?: string;
  terms?: string;
};

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; invoiceId: string }>;
}) {
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [invoice, setInvoice] = useState<InvoiceDetail>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void params.then((value) => {
      setWorkspaceSlug(value.workspaceSlug);
      setInvoiceId(value.invoiceId);
    });
  }, [params]);

  useEffect(() => {
    if (!workspaceSlug || !invoiceId) return;
    apiRequest<InvoiceDetail>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/invoices/${encodeURIComponent(invoiceId)}`,
    )
      .then(setInvoice)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Unable to load invoice."),
      )
      .finally(() => setLoading(false));
  }, [workspaceSlug, invoiceId]);

  const money = (amountMinor: number) =>
    invoice
      ? (amountMinor / 10 ** invoice.minorUnit).toLocaleString(undefined, {
          style: "currency",
          currency: invoice.currency,
        })
      : "";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/w/${workspaceSlug}/invoices`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#25865A]"
      >
        <ArrowLeft size={16} />
        All invoices
      </Link>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-[#E4E9E3] bg-white" />
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
        >
          {error}
        </div>
      ) : invoice ? (
        <>
          <header className="flex flex-col gap-4 rounded-2xl border border-[#E4E9E3] bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-[#25865A]">
                <Receipt size={20} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#707A73]">
                  Invoice
                </p>
                <h1 className="mt-1 text-2xl font-bold text-[#19251F]">
                  {invoice.invoiceNumber}
                </h1>
              </div>
            </div>
            {invoice.status !== "draft" && (
              <a
                href={`/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/invoices/${encodeURIComponent(invoiceId)}/pdf`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#E4E9E3] px-4 text-sm font-semibold text-[#153D2E]"
              >
                <Download size={16} />
                Download PDF
              </a>
            )}
          </header>

          <section className="grid gap-4 sm:grid-cols-3">
            {[
              ["Total", invoice.totalMinor],
              ["Paid", invoice.amountPaidMinor],
              ["Outstanding", invoice.amountDueMinor],
            ].map(([label, amount]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-[#E4E9E3] bg-white p-5"
              >
                <p className="text-sm text-[#707A73]">{label}</p>
                <p className="mt-2 text-xl font-bold text-[#19251F]">
                  {money(Number(amount))}
                </p>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#E4E9E3] bg-white">
            <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#EEF1ED] px-5 py-4">
              <div>
                <p className="text-xs text-[#707A73]">Client</p>
                <p className="mt-1 font-semibold text-[#19251F]">
                  {invoice.clientSnapshot?.companyName ||
                    invoice.clientSnapshot?.name ||
                    "Client"}
                </p>
              </div>
              <p className="text-sm capitalize text-[#707A73]">
                {invoice.computedStatus}
              </p>
            </div>
            <div className="divide-y divide-[#EEF1ED]">
              {invoice.lineItems.map((item, index) => (
                <div
                  key={`${item.description}-${index}`}
                  className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4"
                >
                  <div>
                    <p className="font-medium text-[#19251F]">{item.description}</p>
                    <p className="mt-1 text-xs text-[#707A73]">
                      Qty {(item.quantityMilli / 1000).toLocaleString()}
                    </p>
                  </div>
                  <p className="font-semibold text-[#19251F]">
                    {money(item.lineTotalMinor)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
