"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/ui/brand-logo";

type Mode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";
const labels: Record<Mode, { title: string; subtitle: string; submit: string }> = {
  "sign-in": {
    title: "Welcome back",
    subtitle: "Sign in to your FreelanceFlow workspace.",
    submit: "Sign in",
  },
  "sign-up": {
    title: "Create your account",
    subtitle: "Start with a secure personal workspace.",
    submit: "Create account",
  },
  "forgot-password": {
    title: "Reset your password",
    subtitle: "We’ll send a secure recovery link if email delivery is configured.",
    submit: "Send recovery link",
  },
  "reset-password": {
    title: "Choose a new password",
    subtitle: "Use at least 12 characters.",
    submit: "Reset password",
  },
};

async function post(path: string, body: Record<string, string>) {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error)
    throw new Error(
      payload.message ?? payload.error?.message ?? "Unable to complete this request.",
    );
  return payload;
}

export function AuthCard({
  mode,
  token,
  demoAccount,
}: {
  mode: Mode;
  token?: string;
  demoAccount?: { email: string; password: string };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [email, setEmail] = useState(demoAccount?.email ?? "");
  const [password, setPassword] = useState(demoAccount?.password ?? "");
  const copy = labels[mode];
  async function submit(formData: FormData) {
    setPending(true);
    setError(undefined);
    setMessage(undefined);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    if (mode === "sign-up") {
      const confirmation = String(formData.get("confirmPassword") ?? "");
      if (password !== confirmation) {
        setError("Passwords do not match.");
        setPending(false);
        return;
      }
    }
    try {
      if (mode === "sign-in")
        await post("sign-in/email", {
          email,
          password,
          callbackURL: "/select-workspace",
        });
      if (mode === "sign-up")
        await post("sign-up/email", {
          name: String(formData.get("name") ?? ""),
          email,
          password,
          callbackURL: "/onboarding",
        });
      if (mode === "forgot-password")
        await post("forgot-password", {
          email,
        });
      if (mode === "reset-password")
        await post("reset-password", {
          token: token ?? "",
          password,
          confirmPassword: password,
        });
      if (mode === "sign-in") {
        router.push("/select-workspace");
        router.refresh();
      } else if (mode === "sign-up") {
        setMessage(
          "Account created. Check your inbox if email verification is configured.",
        );
      } else if (mode === "forgot-password") {
        setMessage("If an account exists, a password recovery email will be sent.");
      } else {
        setMessage("Password updated. You can now sign in.");
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to complete this request.",
      );
    } finally {
      setPending(false);
    }
  }
  const passwordMode =
    mode === "sign-in" || mode === "sign-up" || mode === "reset-password";
  return (
    <section className="w-full max-w-md rounded-3xl border border-[#E4E9E3] bg-white p-7 shadow-xl shadow-emerald-950/5 sm:p-9">
      <div className="mb-4">
        <BrandLogo size="sm" theme="light" subtitle="Authentication" />
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#19251F]">
        {copy.title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#707A73]">{copy.subtitle}</p>
      <form action={submit} className="mt-7 space-y-4" aria-busy={pending}>
        {mode === "sign-up" && (
          <label className="block text-sm font-medium">
            Name
            <input
              required
              name="name"
              autoComplete="name"
              className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5 outline-none focus:border-[#25865A] focus:ring-3 focus:ring-emerald-100"
            />
          </label>
        )}
        {mode !== "reset-password" && (
          <label className="block text-sm font-medium">
            Email
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5 outline-none focus:border-[#25865A] focus:ring-3 focus:ring-emerald-100"
            />
          </label>
        )}
        {passwordMode && (
          <label className="block text-sm font-medium">
            Password
            <div className="relative mt-1.5">
              <input
                required
                minLength={12}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5 pr-12 outline-none focus:border-[#25865A] focus:ring-3 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex items-center text-[#25865A]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
        )}
        {mode === "sign-up" && (
          <label className="block text-sm font-medium">
            Confirm password
            <input
              required
              minLength={12}
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-xl border border-[#E4E9E3] px-3 py-2.5 outline-none focus:border-[#25865A] focus:ring-3 focus:ring-emerald-100"
            />
          </label>
        )}
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
          className="w-full rounded-xl bg-lime-300 px-4 py-3 font-semibold text-[#102B22] transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Please wait…" : copy.submit}
        </button>
      </form>
      <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-[#25865A]">
        {mode !== "sign-in" && <Link href="/sign-in">Sign in</Link>}
        {mode !== "sign-up" && <Link href="/sign-up">Create account</Link>}
        {mode === "sign-in" && <Link href="/forgot-password">Forgot password?</Link>}
      </div>
    </section>
  );
}
