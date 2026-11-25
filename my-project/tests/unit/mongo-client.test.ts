import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/env", () => ({ getServerEnv: vi.fn() }));

import { getMongoClientInstance } from "../../src/server/db/mongo-client";

type MongoGlobals = typeof globalThis & {
  __freelanceFlowMongoClient?: unknown;
  __freelanceFlowMongoClientPromise?: Promise<unknown>;
};

const mongoGlobals = globalThis as MongoGlobals;
const originalMongoUri = process.env.MONGODB_URI;

afterEach(() => {
  delete mongoGlobals.__freelanceFlowMongoClient;
  delete mongoGlobals.__freelanceFlowMongoClientPromise;
  if (originalMongoUri === undefined) {
    delete process.env.MONGODB_URI;
  } else {
    process.env.MONGODB_URI = originalMongoUri;
  }
});

describe("MongoDB client configuration", () => {
  it("explains how to fix unescaped credential characters", () => {
    process.env.MONGODB_URI = "mongodb://demo:pass:word@localhost:27017/freelanceflow";

    expect(() => getMongoClientInstance()).toThrow(
      /Percent-encode the username and password/,
    );
    expect(mongoGlobals.__freelanceFlowMongoClient).toBeUndefined();
  });
});
