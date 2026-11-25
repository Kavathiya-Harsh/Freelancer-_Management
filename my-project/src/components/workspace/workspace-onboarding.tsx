"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WorkspaceOnboarding() {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  async function create(formData: FormData) {
    setPending(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const response = await fetch("/api/v1/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: formData.get("name"), slug: formData.get("slug") }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error?.message ?? "Unable to create workspace.");
      setMessage(`Workspace ${payload.data.name} is ready. You can now select it.`);
      window.setTimeout(() => router.push("/select-workspace"), 700);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create workspace.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="w-full max-w-lg rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-700">
        Onboarding
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[#123524]">
        Create your workspace
      </h1>
      <p className="mt-2 text-[#587061]">
        A workspace keeps your future clients and projects isolated.
      </p>
      <form action={create} className="mt-7 space-y-4">
        <label className="block text-sm font-medium">
          Workspace name
          <input
            required
            name="name"
            minLength={2}
            maxLength={80}
            className="mt-1.5 w-full rounded-xl border border-emerald-100 px-3 py-2.5"
          />
        </label>
        <label className="block text-sm font-medium">
          Workspace URL
          <input
            required
            name="slug"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            minLength={3}
            maxLength={50}
            className="mt-1.5 w-full rounded-xl border border-emerald-100 px-3 py-2.5"
          />
          <span className="mt-1 block text-xs text-[#587061]">
            Lowercase letters, numbers, and hyphens only.
          </span>
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {message}
          </p>
        )}
        <button
          disabled={pending}
          className="w-full rounded-xl bg-[#123524] px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create workspace"}
        </button>
      </form>
    </section>
  );
}
