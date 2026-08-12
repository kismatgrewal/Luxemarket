import { describe, expect, it } from "vitest";

/**
 * Marketplace commission math.
 *
 * There is no shared helper under `src/server` yet, so the formula is defined
 * inline here. It MIRRORS the per-line-item split documented for
 * `src/server/services/orders.ts`:
 *
 *   gross            = unitPriceCents * quantity
 *   commissionCents  = round(gross * commissionBps / 10000)
 *   vendorEarnings   = gross - commissionCents
 *
 * Everything is integer cents; the invariant `commission + earnings === gross`
 * must hold exactly with zero float drift. If a real helper is later exported
 * from `orders.ts`, import it here and delete the local copy.
 */
function splitLine(unitPriceCents: number, quantity: number, commissionBps: number) {
  const grossCents = unitPriceCents * quantity;
  const commissionCents = Math.round((grossCents * commissionBps) / 10000);
  const vendorEarningsCents = grossCents - commissionCents;
  return { grossCents, commissionCents, vendorEarningsCents };
}

describe("commission split", () => {
  it("computes 12% (1200 bps) on a round amount", () => {
    const line = splitLine(10000, 1, 1200);
    expect(line.grossCents).toBe(10000);
    expect(line.commissionCents).toBe(1200);
    expect(line.vendorEarningsCents).toBe(8800);
  });

  it("computes 15% (1500 bps) and rounds to the nearest cent", () => {
    // 9999 * 1500 / 10000 = 1499.85 -> rounds to 1500.
    const line = splitLine(9999, 1, 1500);
    expect(line.commissionCents).toBe(1500);
    expect(line.vendorEarningsCents).toBe(8499);
  });

  it("multiplies by quantity before taking commission", () => {
    // gross = 2599 * 3 = 7797; 7797 * 1200 / 10000 = 935.64 -> 936.
    const line = splitLine(2599, 3, 1200);
    expect(line.grossCents).toBe(7797);
    expect(line.commissionCents).toBe(936);
    expect(line.vendorEarningsCents).toBe(6861);
  });

  it("rounds half away from zero (Math.round semantics)", () => {
    // 4 * 1250 / 10000 = 0.5 -> Math.round(0.5) = 1.
    const line = splitLine(4, 1, 1250);
    expect(line.commissionCents).toBe(1);
    expect(line.vendorEarningsCents).toBe(3);
  });

  it("handles the boundary rates: 0 bps and 10000 bps", () => {
    const free = splitLine(5000, 2, 0);
    expect(free.commissionCents).toBe(0);
    expect(free.vendorEarningsCents).toBe(10000);

    const all = splitLine(5000, 2, 10000);
    expect(all.commissionCents).toBe(10000);
    expect(all.vendorEarningsCents).toBe(0);
  });

  it("handles a zero-value line", () => {
    const line = splitLine(0, 4, 1200);
    expect(line.grossCents).toBe(0);
    expect(line.commissionCents).toBe(0);
    expect(line.vendorEarningsCents).toBe(0);
  });

  it("always yields integer cents with no float drift", () => {
    const bpsValues = [0, 250, 1200, 1500, 2999, 10000];
    const prices = [1, 99, 100, 1999, 2599, 123456];
    const quantities = [1, 2, 3, 7];

    for (const bps of bpsValues) {
      for (const price of prices) {
        for (const qty of quantities) {
          const { grossCents, commissionCents, vendorEarningsCents } = splitLine(price, qty, bps);
          expect(Number.isInteger(commissionCents)).toBe(true);
          expect(Number.isInteger(vendorEarningsCents)).toBe(true);
          // The load-bearing invariant: the split reconstructs the gross exactly.
          expect(commissionCents + vendorEarningsCents).toBe(grossCents);
          // Neither side can be negative for non-negative inputs.
          expect(commissionCents).toBeGreaterThanOrEqual(0);
          expect(vendorEarningsCents).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("sums correctly across a multi-vendor order", () => {
    // Three lines from different vendors on one order.
    const lines = [
      splitLine(4999, 1, 1200), // vendor A @ 12%
      splitLine(1250, 2, 1500), // vendor B @ 15%
      splitLine(899, 3, 1000), // vendor C @ 10%
    ];

    const gross = lines.reduce((s, l) => s + l.grossCents, 0);
    const commission = lines.reduce((s, l) => s + l.commissionCents, 0);
    const earnings = lines.reduce((s, l) => s + l.vendorEarningsCents, 0);

    expect(gross).toBe(4999 + 2500 + 2697);
    expect(commission + earnings).toBe(gross);
    // Per-line: 4999*.12=599.88->600; 2500*.15=375; 2697*.10=269.7->270.
    expect(commission).toBe(600 + 375 + 270);
  });
});
