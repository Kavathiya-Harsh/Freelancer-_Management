import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMongoClient: vi.fn(),
  getServerEnv: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({ GET: mocks.get, POST: mocks.post }),
}));
vi.mock("@/server/auth/auth", () => ({ auth: {} }));
vi.mock("@/server/db/mongo-client", () => ({
  getMongoClient: mocks.getMongoClient,
}));
vi.mock("@/server/env", () => ({ getServerEnv: mocks.getServerEnv }));

import { GET, POST } from "../../src/app/api/auth/[...all]/route";

describe("auth route database connection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([["GET", GET, mocks.get], ["POST", POST, mocks.post]] as const)(
    "%s connects to MongoDB before handling the request",
    async (_method, route, handler) => {
      const request = new Request("http://localhost/api/auth");
      const response = new Response("ok");
      mocks.getMongoClient.mockResolvedValue({});
      handler.mockResolvedValue(response);

      await expect(route(request)).resolves.toBe(response);

      expect(mocks.getServerEnv.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.getMongoClient.mock.invocationCallOrder[0],
      );
      expect(mocks.getMongoClient.mock.invocationCallOrder[0]).toBeLessThan(
        handler.mock.invocationCallOrder[0],
      );
    },
  );

  it("does not run the auth handler when MongoDB is unavailable", async () => {
    mocks.getMongoClient.mockRejectedValue(new Error("Database unavailable"));

    await expect(POST(new Request("http://localhost/api/auth"))).rejects.toThrow(
      "Database unavailable",
    );
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
