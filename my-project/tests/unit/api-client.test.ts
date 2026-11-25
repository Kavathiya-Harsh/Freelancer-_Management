import { describe, expect, it, vi, afterEach } from "vitest";
import { apiRequest } from "../../src/lib/api-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("API client", () => {
  it("parses standardized JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: { id: "123" },
              meta: { requestId: "req_123" },
            }),
            {
              status: 200,
              headers: {
                "content-type": "application/json",
                "x-request-id": "req_123",
              },
            },
          ),
      ),
    );
    await expect(apiRequest<{ id: string }>("/test")).resolves.toEqual({ id: "123" });
  });

  it("maps backend errors into the typed API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: "FORBIDDEN",
                message: "Access denied.",
                details: [],
              },
              meta: { requestId: "req_forbidden" },
            }),
            {
              status: 403,
              headers: {
                "content-type": "application/json",
                "x-request-id": "req_forbidden",
              },
            },
          ),
      ),
    );
    await expect(apiRequest("/test")).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
      requestId: "req_forbidden",
    });
  });
});
