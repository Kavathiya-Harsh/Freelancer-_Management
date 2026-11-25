import { describe, expect, it } from "vitest";
import { getDatabaseName, validateSeedTarget } from "../../scripts/seed-demo.mjs";

describe("demo seed safety", () => {
  it("requires an explicit database name", () => {
    expect(getDatabaseName("mongodb://localhost:27017/freelanceflow-demo")).toBe(
      "freelanceflow-demo",
    );
  });

  it("rejects production-like targets", () => {
    expect(() =>
      validateSeedTarget("mongodb://prod.example.com/freelanceflow-production"),
    ).toThrow();
  });

  it("allows an explicitly designated demo database", () => {
    expect(validateSeedTarget("mongodb://localhost:27017/freelanceflow-dev", false)).toBe(
      "freelanceflow-dev",
    );
  });
});
