"use client";

import { useEffect, useState } from "react";
import { Building2, UserRound } from "lucide-react";
import { apiRequest } from "@/lib/api-client";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void params.then(({ workspaceSlug: slug }) => setWorkspaceSlug(slug));
  }, [params]);

  useEffect(() => {
    if (!workspaceSlug) return;
    fetch(`/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.error?.message ?? "Unable to load workspace settings.");
        setRole(payload.data?.role ?? "");
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Unable to load settings."),
      );
    fetch("/api/v1/workspaces", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (response.ok) {
          const workspaces = payload.data as
            Array<{ slug: string; name: string }> | undefined;
          setWorkspaceName(
            workspaces?.find((workspace) => workspace.slug === workspaceSlug)?.name ??
              workspaceSlug,
          );
        }
      })
      .catch(() => setWorkspaceName(workspaceSlug));
  }, [workspaceSlug]);

  useEffect(() => {
    if (!workspaceSlug) return;
    apiRequest<{
      currency?: string;
      timezone?: string;
      invoicePrefix?: string;
    }>(`/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/preferences`)
      .then((payload) => {
        setCurrency(payload.currency ?? "USD");
        setTimezone(payload.timezone ?? "UTC");
        setInvoicePrefix(payload.invoicePrefix ?? "INV");
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Unable to load preferences."),
      );
  }, [workspaceSlug]);

  async function savePreferences(event: React.FormEvent) {
    event.preventDefault();
    if (!workspaceSlug) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest(
        `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/preferences`,
        {
          method: "PATCH",
          body: JSON.stringify({ currency, timezone, invoicePrefix }),
        },
      );
      setSuccess("Workspace preferences saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-medium text-[#25865A]">Workspace</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#19251F]">
          Settings
        </h1>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {success}
        </div>
      )}
      <section className="rounded-2xl border border-[#E4E9E3] bg-white p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#25865A]">
            <Building2 size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-[#19251F]">Workspace profile</h2>
            <p className="text-xs text-[#707A73]">/{workspaceSlug}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-[#19251F]">
            Workspace name
            <input
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              disabled
              className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] bg-[#F7F8F5] px-3 py-2.5 text-[#707A73]"
            />
          </label>
          <label className="text-sm font-medium text-[#19251F]">
            Your role
            <input
              value={role}
              readOnly
              className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] bg-[#F7F8F5] px-3 py-2.5 capitalize text-[#707A73]"
            />
          </label>
        </div>
      </section>
      <section className="rounded-2xl border border-[#E4E9E3] bg-white p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#25865A]">
            <UserRound size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-[#19251F]">Workspace preferences</h2>
            <p className="text-sm text-[#707A73]">
              Default currency, reporting timezone and invoice numbering.
            </p>
          </div>
        </div>
        <form onSubmit={savePreferences} className="mt-6 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium text-[#19251F]">
            Default currency
            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              maxLength={3}
              pattern="[A-Z]{3}"
              className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-medium text-[#19251F]">
            Timezone
            <input
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-medium text-[#19251F]">
            Invoice prefix
            <input
              value={invoicePrefix}
              onChange={(event) => setInvoicePrefix(event.target.value.toUpperCase())}
              maxLength={12}
              className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5"
            />
          </label>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={saving || !["owner", "admin"].includes(role)}
              title={
                !["owner", "admin"].includes(role)
                  ? "Owner or admin role required"
                  : undefined
              }
              className="rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-semibold text-[#102B22] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save preferences"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
