export type ApiErrorDetails = {
  code: string;
  message: string;
  details: unknown[];
  requestId?: string;
  status: number;
};

export class ApiError extends Error {
  readonly code: string;
  readonly details: unknown[];
  readonly requestId?: string;
  readonly status: number;

  constructor(input: ApiErrorDetails) {
    super(input.message);
    this.name = "ApiError";
    this.code = input.code;
    this.details = input.details;
    this.requestId = input.requestId;
    this.status = input.status;
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("content-type")
  ) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
    cache: options.cache ?? "no-store",
  });
  const requestId = response.headers.get("x-request-id") ?? undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = payload?.error;
      throw new ApiError({
        code: error?.code ?? "REQUEST_FAILED",
        message: error?.message ?? "The request could not be completed.",
        details: Array.isArray(error?.details) ? error.details : [],
        requestId: payload?.meta?.requestId ?? requestId,
        status: response.status,
      });
    }
    return (payload?.data ?? payload) as T;
  }
  if (!response.ok) {
    throw new ApiError({
      code: "REQUEST_FAILED",
      message: "The request could not be completed.",
      details: [],
      requestId,
      status: response.status,
    });
  }
  return (await response.blob()) as T;
}
