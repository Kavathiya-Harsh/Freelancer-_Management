import Link from "next/link";
export default function VerifyEmailPage() {
  return (
    <section className="w-full max-w-md">
      <div className="rounded-3xl border border-[#E4E9E3] bg-white p-7 shadow-xl shadow-emerald-950/5 sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#25865A]">
          Account verification
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#19251F]">
          Check your inbox
        </h1>
        <p className="mt-3 leading-7 text-[#707A73]">
          Open the verification link sent to your email. Delivery depends on the
          configured email provider.
        </p>
        <Link
          href="/sign-in"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#153D2E] px-5 text-sm font-semibold text-white hover:bg-[#102B22]"
        >
          Back to sign in
        </Link>
      </div>
    </section>
  );
}
