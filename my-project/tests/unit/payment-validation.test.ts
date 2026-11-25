import { describe, expect, it } from "vitest";
import {
  paymentInputSchema,
  paymentReversalSchema,
  paymentStatusUpdateSchema,
} from "../../src/validations/payment";

describe("payment validation", () => {
  it("accepts a positive successful payment", () => {
    const result = paymentInputSchema.parse({
      invoiceId: "507f1f77bcf86cd799439011",
      amountMinor: 5000,
      paymentMethod: "bank_transfer",
      status: "successful",
    });
    expect(result.amountMinor).toBe(5000);
    expect(result.status).toBe("successful");
  });

  it("rejects zero payments and reversed status updates", () => {
    expect(() =>
      paymentInputSchema.parse({
        invoiceId: "507f1f77bcf86cd799439011",
        amountMinor: 0,
        paymentMethod: "cash",
      }),
    ).toThrow();
    expect(() => paymentStatusUpdateSchema.parse({ status: "reversed" })).toThrow();
  });

  it("requires a meaningful reversal reason", () => {
    expect(() => paymentReversalSchema.parse({ reason: "x" })).toThrow();
  });
});
