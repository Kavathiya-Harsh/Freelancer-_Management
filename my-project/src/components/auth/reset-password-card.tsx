"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Lock,
  ShieldCheck,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import {
  passwordValidationMessage,
  getPasswordChecklist,
  getPasswordStrength,
  isStrongPassword,
} from "@/validations/password";

export function ResetPasswordCard({ token }: { token?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>();
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  const checklist = getPasswordChecklist(password);
  const strength = getPasswordStrength(password);
  const valid = isStrongPassword(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // Auto redirect to sign-in on success
  useEffect(() => {
    if (!success) return;
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push("/sign-in");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [success, router]);

  // If no token was provided in the URL query string
  if (!token) {
    return (
      <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#E4E9E3] bg-white p-7 shadow-xl shadow-emerald-950/5 sm:p-9">
        <div className="flex items-center justify-between mb-4">
          <BrandLogo size="sm" theme="light" subtitle="Password Reset" />
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="text-sm leading-6 text-amber-900">
              <h2 className="font-semibold text-amber-950 text-base">Invalid or Missing Link</h2>
              <p className="mt-1">
                This password reset link is invalid, incomplete, or has expired. Password reset links are valid for only 20 minutes.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Link
            href="/forgot-password"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-3 font-semibold text-[#102B22] shadow-sm transition hover:bg-lime-200 active:scale-[0.99]"
          >
            Request a new recovery link
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/sign-in"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E4E9E3] py-2.5 text-sm font-semibold text-[#19251F] transition hover:bg-stone-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </section>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const complexityError = passwordValidationMessage(password);
    if (complexityError) {
      setError(complexityError);
      return;
    }

    setPending(true);
    setError(undefined);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.error) {
        throw new Error(
          data.error?.message ||
            "Unable to reset password. This link may have expired or already been used.",
        );
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reset password. Please request a new recovery link.",
      );
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#E4E9E3] bg-white p-7 shadow-xl shadow-emerald-950/5 sm:p-9 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <BrandLogo size="sm" theme="light" subtitle="Password Reset" />
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#25865A] border border-emerald-100">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
            <CheckCircle2 className="h-9 w-9 text-[#25865A]" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-emerald-950">
            Password reset complete!
          </h2>
          <p className="mt-2 text-sm text-emerald-800 leading-relaxed">
            Your password has been securely updated. All previous sessions have been signed out.
          </p>
          <div className="mt-3 text-xs font-medium text-emerald-700 bg-emerald-100/60 rounded-full py-1 px-3 inline-block">
            Redirecting to sign-in in {redirectCountdown}s…
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/sign-in"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-3 font-semibold text-[#102B22] shadow-sm transition hover:bg-lime-200 active:scale-[0.99]"
          >
            Sign in with new password
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#E4E9E3] bg-white p-7 shadow-xl shadow-emerald-950/5 sm:p-9">
      {/* Subtle decorative glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-lime-300/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-emerald-300/20 blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <BrandLogo size="sm" theme="light" subtitle="Password Reset" />
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#25865A] border border-emerald-100">
            <Lock className="h-4.5 w-4.5" />
          </div>
        </div>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#19251F]">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#707A73]">
          Create a strong password with at least 12 characters to protect your account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" aria-busy={pending} noValidate>
          {/* New Password */}
          <label className="block text-sm font-medium text-[#19251F]">
            New password
            <div className="relative mt-1.5">
              <input
                required
                minLength={12}
                maxLength={128}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(undefined);
                }}
                placeholder="At least 12 characters"
                className="w-full rounded-xl border border-[#E4E9E3] bg-white px-3.5 py-2.5 pr-12 outline-none transition focus:border-[#25865A] focus:ring-3 focus:ring-emerald-100 placeholder:text-[#9AA39C]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-[#707A73] hover:text-[#19251F]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {/* Password Strength Visual Meter */}
          {password.length > 0 && (
            <div className="space-y-1.5 rounded-xl border border-stone-200/80 bg-stone-50/60 p-3 text-xs animate-in fade-in">
              <div className="flex items-center justify-between font-medium text-[#707A73]">
                <span>Password strength:</span>
                <span className={`font-semibold ${strength.score >= 3 ? "text-emerald-700" : strength.score === 2 ? "text-amber-700" : "text-red-700"}`}>
                  {strength.label}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                <div className={`rounded-full transition-colors ${strength.score >= 1 ? strength.color : "bg-stone-200"}`} />
                <div className={`rounded-full transition-colors ${strength.score >= 2 ? strength.color : "bg-stone-200"}`} />
                <div className={`rounded-full transition-colors ${strength.score >= 3 ? strength.color : "bg-stone-200"}`} />
                <div className={`rounded-full transition-colors ${strength.score >= 4 ? strength.color : "bg-stone-200"}`} />
              </div>

              {/* Requirements Checklist */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 text-[11px] text-[#707A73]">
                <div className={`flex items-center gap-1 ${checklist.minLength ? "text-emerald-700 font-medium" : ""}`}>
                  {checklist.minLength ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-stone-400" />}
                  12+ characters
                </div>
                <div className={`flex items-center gap-1 ${checklist.hasUpper && checklist.hasLower ? "text-emerald-700 font-medium" : ""}`}>
                  {checklist.hasUpper && checklist.hasLower ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-stone-400" />}
                  Upper & lowercase
                </div>
                <div className={`flex items-center gap-1 ${checklist.hasNumber ? "text-emerald-700 font-medium" : ""}`}>
                  {checklist.hasNumber ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-stone-400" />}
                  At least 1 number
                </div>
                <div className={`flex items-center gap-1 ${checklist.hasSymbol ? "text-emerald-700 font-medium" : ""}`}>
                  {checklist.hasSymbol ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-stone-400" />}
                  Special symbol (!@#$)
                </div>
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <label className="block text-sm font-medium text-[#19251F]">
            Confirm new password
            <div className="relative mt-1.5">
              <input
                required
                minLength={12}
                maxLength={128}
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(undefined);
                }}
                placeholder="Repeat new password"
                className="w-full rounded-xl border border-[#E4E9E3] bg-white px-3.5 py-2.5 pr-12 outline-none transition focus:border-[#25865A] focus:ring-3 focus:ring-emerald-100 placeholder:text-[#9AA39C]"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-3 flex items-center text-[#707A73] hover:text-[#19251F]"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {/* Confirmation match helper */}
          {confirmPassword.length > 0 && (
            <div className="flex items-center gap-1 text-xs animate-in fade-in">
              {passwordsMatch ? (
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Passwords match
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700">
                  <X className="h-3.5 w-3.5 text-amber-600" />
                  Passwords do not match yet
                </span>
              )}
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 animate-in fade-in">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending || !valid || !passwordsMatch}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-3 font-semibold text-[#102B22] shadow-sm transition hover:bg-lime-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#102B22]" />
                Updating password…
              </>
            ) : (
              <>
                Reset password
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
              Cancel and back to sign in
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
