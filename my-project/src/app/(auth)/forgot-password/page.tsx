import type { Metadata } from "next";
import { ForgotPasswordCard } from "@/components/auth/forgot-password-card";

export const metadata: Metadata = {
  title: "Forgot Password | FreelanceFlow",
  description: "Recover your FreelanceFlow account password safely and securely.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordCard />;
}
