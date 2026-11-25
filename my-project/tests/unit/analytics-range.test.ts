import { describe, expect, it } from "vitest";
import {
  resolveAnalyticsRange,
  safeCsvCell,
  successfulPaymentMatch,
  zonedMidnight,
} from "../../src/server/analytics/range";

describe("analytics date ranges and CSV safety", () => {
  it("builds equivalent previous periods for a preset", () => {
    const range = resolveAnalyticsRange(
      { preset: "7d" },
      "UTC",
      new Date("2026-05-12T14:00:00Z"),
    );
    expect(range.end.getTime() - range.start.getTime()).toBe(7 * 86_400_000);
    expect(range.previousEnd).toEqual(range.start);
    expect(range.previousEnd.getTime() - range.previousStart.getTime()).toBe(
      7 * 86_400_000,
    );
  });

  it("validates custom ranges and respects the selected timezone boundary", () => {
    expect(() =>
      resolveAnalyticsRange(
        { preset: "custom", start: "2026-06-10", end: "2026-06-10" },
        "Asia/Kolkata",
      ),
    ).toThrow("INVALID_DATE_RANGE");
    expect(zonedMidnight("2026-06-10", "Asia/Kolkata").toISOString()).toBe(
      "2026-06-09T18:30:00.000Z",
    );
  });

  it("prevents formula injection in CSV cells", () => {
    expect(safeCsvCell("=SUM(A1:A2)")).toBe('"\'=SUM(A1:A2)"');
    expect(safeCsvCell('a"b')).toBe('"a""b"');
  });

  it("includes only successful payments in a workspace payment date range", () => {
    const match = successfulPaymentMatch(
      "org_123",
      new Date("2026-05-01T00:00:00Z"),
      new Date("2026-06-01T00:00:00Z"),
    );
    expect(match).toEqual({
      organizationId: "org_123",
      status: "successful",
      paymentDate: {
        $gte: new Date("2026-05-01T00:00:00Z"),
        $lt: new Date("2026-06-01T00:00:00Z"),
      },
    });
  });
});
