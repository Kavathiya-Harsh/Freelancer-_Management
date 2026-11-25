"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
  lifecycle: "active" | "archived" | "unprovisioned";
};
export function WorkspaceSelector() {
  const [items, setItems] = useState<Workspace[]>();
  const [error, setError] = useState<string>();
  const router = useRouter();
  useEffect(() => {
    fetch("/api/v1/workspaces")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error?.message ?? "Unable to load workspaces.");
        setItems(body.data);
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unable to load workspaces."),
      );
  }, []);
  async function select(workspace: Workspace) {
    try {
      const response = await fetch(`/api/v1/workspaces/${workspace.slug}/select`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Unable to select workspace.");
      router.push(`/w/${workspace.slug}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to select workspace.");
    }
  }
  return (
    <section className="w-full max-w-2xl rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-700">
        Your workspaces
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[#123524]">Choose where to work</h1>
      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 p-3 text-red-700">
          {error}
        </p>
      )}
      {!items && !error && <p className="mt-6 text-[#587061]">Loading workspaces…</p>}
      {items?.length === 0 && (
        <div className="mt-6 rounded-2xl bg-[#f7faf7] p-6">
          <p className="font-medium">No workspace yet.</p>
          <Link
            className="mt-3 inline-block text-emerald-700 underline"
            href="/onboarding"
          >
            Create your first workspace
          </Link>
        </div>
      )}
      <div className="mt-6 grid gap-3">
        {items?.map((workspace) => (
          <button
            key={workspace.id}
            type="button"
            onClick={() => select(workspace)}
            className="rounded-2xl border border-emerald-100 p-4 text-left transition hover:border-emerald-400"
          >
            <p className="font-semibold text-[#123524]">{workspace.name}</p>
            <p className="mt-1 text-sm text-[#587061]">
              {workspace.role} · {workspace.lifecycle}
            </p>
          </button>
        ))}
      </div>
      {items && items.length > 0 && (
        <div className="mt-6 border-t border-emerald-100/60 pt-4 text-center">
          <Link
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
            href="/onboarding"
          >
            + Create another workspace
          </Link>
        </div>
      )}
    </section>
  );
}
