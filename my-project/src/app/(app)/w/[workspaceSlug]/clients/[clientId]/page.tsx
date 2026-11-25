import Link from "next/link";
export default async function ClientProfile({
  params,
}: {
  params: Promise<{ workspaceSlug: string; clientId: string }>;
}) {
  const { workspaceSlug, clientId } = await params;
  return (
    <section className="space-y-6">
      <Link
        className="text-sm text-emerald-700 underline"
        href={`/w/${workspaceSlug}/clients`}
      >
        Back to clients
      </Link>
      <div className="rounded-3xl border border-emerald-100 bg-white p-8">
        <p className="text-sm font-semibold text-emerald-700">Client profile</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#123524]">Client details</h1>
        <p className="mt-3 text-[#587061]">Client ID: {clientId}</p>
        <p className="mt-6 rounded-xl bg-[#f7faf7] p-4 text-sm text-[#587061]">
          Associated projects, invoices, payments, and activity timelines will appear here
          when those modules are implemented. No records are fabricated.
        </p>
      </div>
    </section>
  );
}
