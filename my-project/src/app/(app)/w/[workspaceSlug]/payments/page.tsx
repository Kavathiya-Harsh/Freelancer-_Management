"use client";

import { useEffect, useState } from "react";
import { Banknote } from "lucide-react";
import { apiRequest } from "@/lib/api-client";

type Payment = {
  _id: string;
  amountMinor: number;
  currency: string;
  minorUnit: number;
  status: string;
  paymentMethod: string;
  paymentDate: string;
  reference?: string;
  invoice?: { invoiceNumber?: string } | null;
};

export default function PaymentsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void params.then(({ workspaceSlug: slug }) => setWorkspaceSlug(slug));
  }, [params]);

  useEffect(() => {
    if (!workspaceSlug) return;
    apiRequest<{ items: Payment[] }>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/payments`,
    )
      .then((payload) => setItems(payload.items ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Unable to load payments."),
      )
      .finally(() => setLoading(false));
  }, [workspaceSlug]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-sm font-medium text-[#25865A]">Finance</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#19251F]">
          Payments
        </h1>
        <p className="mt-2 text-sm text-[#707A73]">
          Workspace payment ledger and reconciliation records.
        </p>
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
          <div className="p-6 text-sm text-[#707A73]">Loading payments…</div>
        ) : items.length ? (
          <div className="divide-y divide-[#EEF1ED]">
            {items.map((payment) => (
              <div
                key={payment._id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#25865A]">
                    <Banknote size={18} />
                  </span>
                  <div>
                    <p className="font-semibold text-[#19251F]">
                      {payment.invoice?.invoiceNumber || "Payment"}
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-[#707A73]">
                      {payment.paymentMethod.replaceAll("_", " ")}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </p>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm font-semibold text-[#19251F]">
                    {(payment.amountMinor / 10 ** payment.minorUnit).toLocaleString(
                      undefined,
                      { style: "currency", currency: payment.currency },
                    )}
                  </p>
                  <p className="mt-1 text-xs capitalize text-[#707A73]">
                    {payment.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <Banknote className="mx-auto text-[#A4AAA6]" size={28} />
            <p className="mt-3 font-semibold text-[#19251F]">No payments yet</p>
            <p className="mt-1 text-sm text-[#707A73]">
              Successful, pending, failed and reversed records will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
