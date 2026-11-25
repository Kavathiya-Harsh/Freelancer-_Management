import "server-only";
import { trustedOrigins } from "@/server/env";

export class InvalidRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRequestError";
  }
}

export function assertJsonRequest(request: Request): void {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new InvalidRequestError("A JSON request body is required.");
  }
}

export function assertTrustedOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;

  let originValue: URL;
  try {
    originValue = new URL(origin);
  } catch {
    throw new InvalidRequestError("Invalid request origin.");
  }

  const allowed = trustedOrigins()
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return null;
      }
    })
    .filter((value): value is string => value !== null);

  if (allowed.length === 0 || !allowed.includes(originValue.origin)) {
    throw new InvalidRequestError("Request origin is not trusted.");
  }
}
