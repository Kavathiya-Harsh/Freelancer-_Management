"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientInputSchema, type ClientInput } from "@/validations/client";
import { useState } from "react";
import { Plus } from "lucide-react";
type Item = {
  _id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  status: string;
  createdAt: string;
};
export function ClientManager({ workspaceSlug }: { workspaceSlug: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState<string>();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ClientInput>({
    resolver: zodResolver(clientInputSchema),
    defaultValues: { name: "" },
  });
  async function load() {
    const r = await fetch(`/api/v1/workspaces/${workspaceSlug}/clients`);
    const b = await r.json();
    if (r.ok) setItems(b.data.items);
    else setMessage(b.error?.message);
  }
  async function submit(values: ClientInput) {
    const r = await fetch(`/api/v1/workspaces/${workspaceSlug}/clients`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const b = await r.json();
    if (!r.ok) {
      setMessage(b.error?.message);
      return;
    }
    setMessage("Client created.");
    setOpen(false);
    reset();
    load();
  }
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[#123524]">Clients</h1>
          <p className="mt-1 text-[#587061]">Manage workspace client relationships.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 font-semibold text-[#123524]"
        >
          <Plus size={18} />
          Add client
        </button>
      </div>
      <button onClick={load} className="rounded-lg border px-3 py-2 text-sm">
        Load clients
      </button>
      {message && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {message}
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f7faf7] text-[#587061]">
            <tr>
              <th className="p-4">Client</th>
              <th>Company</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i._id} className="border-t border-emerald-50">
                <td className="p-4 font-medium">{i.name}</td>
                <td>{i.companyName || "—"}</td>
                <td>{i.email || "—"}</td>
                <td>{i.phone || "—"}</td>
                <td>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
                    {i.status}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-[#587061]">
                  No clients loaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-[#123524]/30 p-4">
          <form
            onSubmit={handleSubmit(submit)}
            className="w-full max-w-lg space-y-3 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-semibold">Add client</h2>
            <label className="block text-sm">
              Name
              <input
                {...register("name")}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            {errors.name && <p className="text-sm text-red-700">{errors.name.message}</p>}
            <label className="block text-sm">
              Company
              <input
                {...register("companyName")}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="block text-sm">
              Email
              <input
                {...register("email")}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="block text-sm">
              Phone
              <input
                {...register("phone")}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="block text-sm">
              Website
              <input
                {...register("website")}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="block text-sm">
              Notes
              <textarea
                {...register("notes")}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2"
              >
                Cancel
              </button>
              <button
                disabled={isSubmitting}
                className="rounded-lg bg-[#123524] px-3 py-2 text-white"
              >
                {isSubmitting ? "Saving…" : "Save client"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
