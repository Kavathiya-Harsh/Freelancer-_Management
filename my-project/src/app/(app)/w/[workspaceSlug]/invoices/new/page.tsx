"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { apiRequest } from "@/lib/api-client";

type Option = { _id: string; name: string; companyName?: string; projectCode?: string };

export default function NewInvoicePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const router = useRouter();
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [clients, setClients] = useState<Option[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void params.then(({ workspaceSlug: slug }) => setWorkspaceSlug(slug));
  }, [params]);

  useEffect(() => {
    if (!workspaceSlug) return;
    Promise.all([
      fetch(`/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/clients?limit=100`, {
        cache: "no-store",
      }),
      fetch(
        `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/projects?limit=100&view=active`,
        {
          cache: "no-store",
        },
      ),
    ])
      .then(async ([clientResponse, projectResponse]) => {
        const [clientPayload, projectPayload] = await Promise.all([
          clientResponse.json(),
          projectResponse.json(),
        ]);
        setClients(clientPayload.data?.items ?? []);
        setProjects(projectPayload.data?.items ?? []);
      })
      .catch(() => setError("Unable to load invoice choices."));
  }, [workspaceSlug]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const minorUnit =
        currency === "JPY" || currency === "KRW"
          ? 0
          : currency === "BHD" || currency === "KWD"
            ? 3
            : 2;
      const parsedQuantity = Math.round(Number(quantity) * 1000);
      const parsedPrice = Math.round(Number(unitPrice) * 10 ** minorUnit);
      if (
        !clientId ||
        !dueDate ||
        !description.trim() ||
        !Number.isFinite(parsedPrice) ||
        parsedPrice < 0
      ) {
        throw new Error("Complete the client, due date, description, and unit price.");
      }
      const created = await apiRequest<{ _id: string }>(
        `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/invoices`,
        {
          method: "POST",
          body: JSON.stringify({
            clientId,
            projectId: projectId || null,
            currency,
            dueDate,
            lineItems: [
              {
                description: description.trim(),
                quantityMilli: parsedQuantity,
                unitAmountMinor: parsedPrice,
                lineDiscountMinor: 0,
                taxRateBasisPoints: 0,
              },
            ],
            notes,
            terms,
          }),
        },
      );
      router.push(`/w/${workspaceSlug}/invoices/${created._id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create invoice.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/w/${workspaceSlug}/invoices`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#25865A]"
      >
        <ArrowLeft size={16} />
        All invoices
      </Link>
      <header>
        <p className="text-sm font-medium text-[#25865A]">Draft invoice</p>
        <h1 className="mt-1 text-3xl font-bold text-[#19251F]">Create invoice</h1>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}
      <form
        onSubmit={submit}
        className="space-y-5 rounded-2xl border border-[#E4E9E3] bg-white p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Client
            <select
              required
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5"
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>
                  {client.companyName || client.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Project (optional)
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5"
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.projectCode ? `${project.projectCode} · ` : ""}
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Currency
            <input
              required
              value={currency}
              maxLength={3}
              pattern="[A-Z]{3}"
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-medium">
            Due date
            <input
              required
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px_160px]">
          <label className="text-sm font-medium">
            Line item
            <input
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-medium">
            Quantity
            <input
              required
              type="number"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-medium">
            Unit price
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5"
            />
          </label>
        </div>
        <label className="block text-sm font-medium">
          Notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5"
            rows={3}
          />
        </label>
        <label className="block text-sm font-medium">
          Terms
          <textarea
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5"
            rows={3}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-lime-300 px-5 text-sm font-semibold text-[#102B22] disabled:opacity-60"
        >
          <Plus size={17} />
          {pending ? "Creating…" : "Create draft invoice"}
        </button>
      </form>
    </div>
  );
}
