import { NextResponse } from "next/server";
import { z } from "zod";
import { emailSchema } from "@/server/auth/validation";
import { requestPasswordReset } from "@/server/auth/password-reset";
import {
  enforceRateLimit,
  getRateLimitFingerprint,
  getTrustedClientIp,
  RateLimitError,
} from "@/server/security/rate-limit";
import {
  assertJsonRequest,
  assertTrustedOrigin,
  InvalidRequestError,
} from "@/server/security/request-origin";
import { requestId } from "@/server/api/response";
import { isPasswordResetEmailConfigured } from "@/server/email/emailjs";

export const runtime = "nodejs";

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const GENERIC_MESSAGE =
  "If an account exists for this email, a password recovery link will be sent.";

export async function POST(request: Request) {
  const id = requestId(request);

  try {
    assertJsonRequest(request);
    assertTrustedOrigin(request);

    if (!isPasswordResetEmailConfigured()) {
      console.error("Password recovery unavailable: email provider not configured", {
        requestId: id,
      });
      return NextResponse.json(
        {
          error: {
            code: "RECOVERY_UNAVAILABLE",
            message: "Password recovery is temporarily unavailable. Please try again later.",
          },
          meta: { requestId: id },
        },
        { status: 503, headers: { "x-request-id": id } },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid email address is required.",
          },
          meta: { requestId: id },
        },
        { status: 400, headers: { "x-request-id": id } },
      );
    }

    const { email } = parsed.data;
    const identifiers = [`email:${email}`];
    const ip = getTrustedClientIp(request);
    identifiers.push(ip ? `ip:${ip}` : `fp:${getRateLimitFingerprint(request)}`);

    await Promise.all(
      identifiers.map((identifier) => enforceRateLimit("forgot-password", identifier)),
    );

    const result = await requestPasswordReset(email);

    if (result.emailDelivery && !result.emailDelivery.success) {
      console.error("Password recovery email delivery failed", {
        requestId: id,
        code: result.emailDelivery.error,
        status: result.emailDelivery.status,
      });
    }

    return NextResponse.json(
      {
        message: result.message ?? GENERIC_MESSAGE,
        meta: { requestId: id },
      },
      { status: 202, headers: { "x-request-id": id } },
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      const unavailable = error.code === "RATE_LIMIT_UNAVAILABLE";
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: unavailable
              ? "Recovery is temporarily unavailable. Please try again later."
              : "Too many requests. Please wait a moment before trying again.",
          },
          meta: { requestId: id },
        },
        { status: unavailable ? 503 : 429, headers: { "x-request-id": id } },
      );
    }

    if (error instanceof InvalidRequestError) {
      return NextResponse.json(
        {
          error: { code: "INVALID_REQUEST", message: error.message },
          meta: { requestId: id },
        },
        { status: 400, headers: { "x-request-id": id } },
      );
    }

    console.error("Forgot password request failed", {
      requestId: id,
      reason: error instanceof Error ? error.name : "UnknownError",
      detail: error instanceof Error ? error.message.slice(0, 240) : undefined,
    });
    return NextResponse.json(
      {
        error: {
          code: "RECOVERY_UNAVAILABLE",
          message: "Password recovery is temporarily unavailable. Please try again later.",
        },
        meta: { requestId: id },
      },
      { status: 503, headers: { "x-request-id": id } },
    );
  }
}
