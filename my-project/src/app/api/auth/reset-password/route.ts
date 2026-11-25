import { NextResponse } from "next/server";
import { z } from "zod";
import { passwordSchema } from "@/server/auth/validation";
import {
  hashResetToken,
  InvalidOrExpiredResetTokenError,
  PasswordMismatchError,
  PasswordResetUnavailableError,
  resetPasswordWithToken,
} from "@/server/auth/password-reset";
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

export const runtime = "nodejs";

const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "Reset token is required.").max(512),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Password confirmation is required.").max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  const id = requestId(request);

  try {
    assertJsonRequest(request);
    assertTrustedOrigin(request);

    const body = await request.json().catch(() => ({}));
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid password reset details.",
          },
          meta: { requestId: id },
        },
        { status: 400, headers: { "x-request-id": id } },
      );
    }

    const { token, password, confirmPassword } = parsed.data;
    const identifiers = [`token:${hashResetToken(token)}`];
    const ip = getTrustedClientIp(request);
    identifiers.push(ip ? `ip:${ip}` : `fp:${getRateLimitFingerprint(request)}`);

    await Promise.all(
      identifiers.map((identifier) => enforceRateLimit("reset-password", identifier)),
    );

    const result = await resetPasswordWithToken({ token, password, confirmPassword });

    return NextResponse.json(
      { message: result.message, meta: { requestId: id } },
      { status: 200, headers: { "x-request-id": id } },
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      const unavailable = error.code === "RATE_LIMIT_UNAVAILABLE";
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: unavailable
              ? "Password reset is temporarily unavailable. Please try again later."
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

    if (error instanceof InvalidOrExpiredResetTokenError) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_OR_EXPIRED_TOKEN",
            message: "This password reset link is invalid or has expired.",
          },
          meta: { requestId: id },
        },
        { status: 400, headers: { "x-request-id": id } },
      );
    }

    if (error instanceof PasswordMismatchError) {
      return NextResponse.json(
        {
          error: { code: "VALIDATION_ERROR", message: "Passwords do not match." },
          meta: { requestId: id },
        },
        { status: 400, headers: { "x-request-id": id } },
      );
    }

    if (error instanceof PasswordResetUnavailableError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message:
              "Password reset is temporarily unavailable. Please request a new link.",
          },
          meta: { requestId: id },
        },
        { status: 503, headers: { "x-request-id": id } },
      );
    }

    console.error("Password reset error", { requestId: id });
    return NextResponse.json(
      {
        error: {
          code: "RESET_FAILED",
          message: "Unable to reset password. Please request a new recovery link.",
        },
        meta: { requestId: id },
      },
      { status: 500, headers: { "x-request-id": id } },
    );
  }
}
