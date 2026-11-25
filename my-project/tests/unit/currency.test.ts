import { describe, expect, it } from "vitest";
import {
  formatMoney,
  getCurrencyMinorUnit,
  majorToMinor,
  minorToMajor,
} from "../../src/server/finance/currencies";

describe("currency minor units", () => {
  it("uses explicit precision for zero-decimal currencies", () => {
    expect(getCurrencyMinorUnit("JPY")).toBe(0);
    expect(getCurrencyMinorUnit("USD")).toBe(2);
  });

  it("converts major and minor units without currency mixing", () => {
    expect(majorToMinor(19.99, 2)).toBe(1999);
    expect(minorToMajor(1999, 2)).toBe(19.99);
    expect(formatMoney(1999, "USD", 2)).toContain("19.99");
  });
});
