"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  Loader2,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { emailSchema } from "@/server/auth/validation";

export function ForgotPasswordCard() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  // Resend cooldown timer (60 seconds)
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  async function handleSend(targetEmail: string) {
    if (pending) return;

    const parsed = emailSchema.safeParse(targetEmail);
    if (!parsed.success) {
      setError("Please enter a valid email address.");
      return;
    }
    const normalizedEmail = parsed.data;

    setPending(true);
    setError(undefined);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok && data.error) {
        throw new Error(data.error.message || "Unable to process recovery request.");
      }

      setSubmittedEmail(normalizedEmail);
      setMessage(
        data.message ||
          "If an account exists for this email, a password recovery link has been sent.",
      );
      setCooldown(60);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to process recovery request.",
      );
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSend(email);
  }

  function handleReset() {
    setSubmittedEmail(undefined);
    setMessage(undefined);
    setError(undefined);
    setCooldown(0);
  }

  return (
    <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#E4E9E3] bg-white p-7 shadow-xl shadow-emerald-950/5 transition-all duration-300 sm:p-9">
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-lime-300/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-emerald-300/20 blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <BrandLogo size="sm" theme="light" subtitle="Account Recovery" />
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#25865A] border border-emerald-100">
            <KeyRound className="h-4.5 w-4.5" />
          </div>
        </div>

        {submittedEmail && message ? (
          /* ─── Success Confirmation State ─── */
          <div className="mt-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                <CheckCircle2 className="h-7 w-7 text-[#25865A]" />
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#19251F]">
                Check your inbox
              </h1>
              <p className="mt-2 text-sm text-[#707A73]">
                We sent password recovery instructions to:
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1 text-xs font-semibold text-emerald-900">
                <Mail className="h-3.5 w-3.5 text-emerald-700" />
                {submittedEmail}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-xs leading-5 text-emerald-950">
              <p className="font-semibold text-emerald-950 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#25865A]" />
                Next steps:
              </p>
              <ul className="space-y-1 text-emerald-800 list-disc list-inside">
                <li>Click the reset link in the email to set a new password.</li>
                <li>The recovery link is valid for <strong>20 minutes</strong>.</li>
                <li>If you don’t see it, be sure to check your spam or junk folder.</li>
              </ul>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3 pt-1">
              <button
                type="button"
                disabled={pending || cooldown > 0}
                onClick={() => handleSend(submittedEmail)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E4E9E3] bg-white py-2.5 text-sm font-semibold text-[#19251F] shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#25865A]" />
                    Resending email…
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5 text-[#707A73]" />
                    Resend email in {cooldown}s
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5 text-[#25865A]" />
                    Resend recovery email
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="w-full text-center text-xs font-medium text-[#707A73] transition hover:text-[#19251F] hover:underline"
              >
                Entered wrong email? Try another address
              </button>

              <Link
                href="/sign-in"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-3 text-sm font-semibold text-[#102B22] shadow-sm transition hover:bg-lime-200 active:scale-[0.99]"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to sign in
              </Link>
            </div>
          </div>
        ) : (
          /* ─── Initial Request Form ─── */
          <>
            <div className="mt-4">
              <h1 className="text-3xl font-semibold tracking-tight text-[#19251F]">
                Reset your password
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#707A73]">
                Enter your account email address and we’ll send you a secure verification link to choose a new password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" aria-busy={pending} noValidate>
              <label className="block text-sm font-medium text-[#19251F]">
                Email address
                <div className="relative mt-1.5">
                  <input
                    required
                    type="email"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(undefined);
                    }}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-[#E4E9E3] bg-white px-3.5 py-2.5 pr-10 outline-none transition focus:border-[#25865A] focus:ring-3 focus:ring-emerald-100 placeholder:text-[#9AA39C]"
                  />
                  {email ? (
                    <button
                      type="button"
                      onClick={() => setEmail("")}
                      className="absolute right-3 top-3 text-[#9AA39C] hover:text-[#19251F]"
                      aria-label="Clear email"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <Mail className="pointer-events-none absolute right-3.5 top-3 h-4 w-4 text-[#707A73]" />
                  )}
                </div>
              </label>

              {error && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 animate-in fade-in">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3 text-xs leading-5 text-[#707A73]">
                <div className="flex items-center gap-1.5 font-medium text-[#19251F]">
                  <ShieldCheck className="h-4 w-4 text-[#25865A]" />
                  Secure Recovery Guarantee
                </div>
                <p className="mt-1">
                  We protect your privacy. If your email is registered, a one-time link valid for 20 minutes will be generated and delivered.
                </p>
              </div>

              <button
                type="submit"
                disabled={pending || !email.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-3 font-semibold text-[#102B22] shadow-sm transition hover:bg-lime-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#102B22]" />
                    Sending recovery link…
                  </>
                ) : (
                  <>
                    Send recovery link
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-sm font-medium text-[#25865A]">
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-1.5 hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </Link>
                <span className="mx-2 text-[#9AA39C]">·</span>
                <Link href="/sign-up" className="hover:underline">
                  Create account
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
