import { describe, expect, it } from "vitest";
import { clientInputSchema, clientListSchema } from "../../src/validations/client";
import { ClientModel } from "../../src/server/models/Client";
describe("client validation", () => {
  it("normalizes valid input through model fields", () => {
    const c = new ClientModel({
      organizationId: "org",
      name: "Acme",
      createdByUserId: "u",
      updatedByUserId: "u",
      normalizedName: "acme",
    });
    expect(c.validateSync()).toBeUndefined();
  });
  it("rejects invalid email and oversized page size", () => {
    expect(clientInputSchema.safeParse({ name: "A", email: "bad" }).success).toBe(false);
    expect(clientListSchema.safeParse({ limit: 101 }).success).toBe(false);
  });
});
