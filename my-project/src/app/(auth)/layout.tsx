import { BrandLogo } from "@/components/ui/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-[#F7F8F5] lg:grid-cols-[minmax(360px,0.85fr)_1.15fr]">
      <section className="hidden relative overflow-hidden bg-[#102B22] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10">
          <BrandLogo size="lg" subtitle="Operating System" theme="dark" />
          <div className="mt-24 max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-300">
              Work with clarity
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight">
              Clients, projects and payments in one calm workspace.
            </h2>
            <p className="mt-5 max-w-md leading-7 text-emerald-100/80">
              Keep every commitment visible and protect the financial health of your
              business.
            </p>
          </div>
        </div>
        <div className="relative z-10 text-xs text-emerald-200/70">
          Secure multi-workspace management
        </div>
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full border-[48px] border-emerald-700/30" />
      </section>
      <section className="flex min-h-screen items-center justify-center p-5 sm:p-8">
        {children}
      </section>
    </main>
  );
}
