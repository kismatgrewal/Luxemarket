import { describe, expect, it } from "vitest";

import { formatCompact, formatMoney } from "@/lib/utils";

// Money in LuxeMarket is always integer minor units (cents). `formatMoney`
// divides by 100 for display, so these tests pin the cents -> dollars contract.
describe("formatMoney()", () => {
  it("formats USD cents as dollars with two fraction digits", () => {
    expect(formatMoney(1999)).toBe("$19.99");
    expect(formatMoney(12345)).toBe("$123.45");
  });

  it("renders exact single-cent precision", () => {
    expect(formatMoney(1)).toBe("$0.01");
    expect(formatMoney(99)).toBe("$0.99");
    expect(formatMoney(100)).toBe("$1.00");
  });

  it("renders zero as $0.00", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("groups thousands for large amounts", () => {
    expect(formatMoney(100000000)).toBe("$1,000,000.00");
    expect(formatMoney(999999999)).toBe("$9,999,999.99");
  });

  it("formats negative amounts (refunds / adjustments)", () => {
    expect(formatMoney(-500)).toBe("-$5.00");
    expect(formatMoney(-1)).toBe("-$0.01");
  });

  it("respects the currency argument", () => {
    expect(formatMoney(2500, "EUR")).toBe("€25.00");
    expect(formatMoney(999, "GBP")).toBe("£9.99");
  });

  it("respects the locale argument for grouping and symbol placement", () => {
    // de-DE uses "." for thousands and "," for decimals, symbol trailing.
    const formatted = formatMoney(123456, "EUR", "de-DE");
    expect(formatted).toContain("1.234,56");
    expect(formatted).toContain("€");
  });

  it("keeps two fraction digits even for zero-decimal currencies", () => {
    // The formatter forces minimumFractionDigits: 2 regardless of currency.
    expect(formatMoney(5000, "JPY")).toBe("¥50.00");
  });
});

describe("formatCompact()", () => {
  it("abbreviates thousands", () => {
    expect(formatCompact(1000)).toBe("1K");
    expect(formatCompact(1200)).toBe("1.2K");
  });

  it("abbreviates millions and billions", () => {
    expect(formatCompact(3400000)).toBe("3.4M");
    expect(formatCompact(1500000000)).toBe("1.5B");
  });

  it("leaves sub-thousand values unabbreviated", () => {
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(999)).toBe("999");
  });

  it("rounds to at most one fraction digit", () => {
    // 1249 -> 1.249K, truncated/rounded to a single fraction digit.
    expect(formatCompact(1249)).toBe("1.2K");
    expect(formatCompact(1990)).toBe("2K");
  });

  it("handles negative values", () => {
    expect(formatCompact(-1500)).toBe("-1.5K");
  });
});
