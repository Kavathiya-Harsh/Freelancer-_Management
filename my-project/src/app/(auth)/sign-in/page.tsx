import { AuthCard } from "@/components/auth/auth-card";
export default function SignInPage() {
  const email = process.env.DEMO_ACCOUNT_EMAIL?.trim();
  const password = process.env.DEMO_ACCOUNT_PASSWORD?.trim();
  return (
    <AuthCard
      mode="sign-in"
      demoAccount={email && password ? { email, password } : undefined}
    />
  );
}
