import type { Metadata } from "next";
import { ResetPasswordCard } from "@/components/auth/reset-password-card";

export const metadata: Metadata = {
  title: "Reset Password | FreelanceFlow",
  description: "Set a new secure password for your FreelanceFlow account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordCard token={typeof token === "string" ? token : undefined} />;
}
