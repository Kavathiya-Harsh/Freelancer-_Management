"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Receipt } from "lucide-react";
import { apiRequest } from "@/lib/api-client";

type Invoice = {
  _id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  totalMinor: number;
  amountDueMinor: number;
  currency: string;
  minorUnit: number;
  clientSnapshot?: { name?: string; companyName?: string };
};

export default function InvoicesPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void params.then(({ workspaceSlug: slug }) => setWorkspaceSlug(slug));
  }, [params]);

  useEffect(() => {
    if (!workspaceSlug) return;
    apiRequest<{ items: Invoice[] }>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/invoices`,
    )
      .then((payload) => setItems(payload.items ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Unable to load invoices."),
      )
      .finally(() => setLoading(false));
  }, [workspaceSlug]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#25865A]">Finance</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#19251F]">
            Invoices
          </h1>
          <p className="mt-2 text-sm text-[#707A73]">
            Issue, track and manage workspace invoices.
          </p>
        </div>
        <Link
          href={`/w/${workspaceSlug}/invoices/new`}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-lime-300 px-4 text-sm font-semibold text-[#102B22] hover:bg-lime-200"
        >
          <Plus size={17} />
          New invoice
        </Link>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#E4E9E3] bg-white">
        {loading ? (
          <div className="p-6 text-sm text-[#707A73]">Loading invoices…</div>
        ) : items.length ? (
          <div className="divide-y divide-[#EEF1ED]">
            {items.map((invoice) => (
              <Link
                key={invoice._id}
                href={`/w/${workspaceSlug}/invoices/${invoice._id}`}
                className="flex flex-col gap-3 px-5 py-4 hover:bg-[#FAFBF8] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#25865A]">
                    <Receipt size={18} />
                  </span>
                  <div>
                    <p className="font-semibold text-[#19251F]">
                      {invoice.invoiceNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-[#707A73]">
                      {invoice.clientSnapshot?.companyName ||
                        invoice.clientSnapshot?.name ||
                        "Client"}
                    </p>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm font-semibold text-[#19251F]">
                    {(invoice.amountDueMinor / 10 ** invoice.minorUnit).toLocaleString(
                      undefined,
                      {
                        style: "currency",
                        currency: invoice.currency,
                      },
                    )}
                  </p>
                  <p className="mt-1 text-xs capitalize text-[#707A73]">
                    {invoice.status}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <Receipt className="mx-auto text-[#A4AAA6]" size={28} />
            <p className="mt-3 font-semibold text-[#19251F]">No invoices yet</p>
            <p className="mt-1 text-sm text-[#707A73]">
              Invoices created in this workspace will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
