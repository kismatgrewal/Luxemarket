import type { Payout } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Vendor payouts.
 *
 * Vendor earnings accrue on `Vendor.payoutBalanceCents` as orders are paid
 * (see `markOrderPaid`). A payout cycle sweeps those balances into `Payout`
 * records for a settlement period. Amounts are cents.
 */

export interface PayoutCycleResult {
  payouts: Payout[];
  vendorCount: number;
  totalCents: number;
}

/**
 * Sweep every approved vendor's accrued balance into a PENDING payout for the
 * given period and zero the balance.
 *
 * Each vendor is handled in its own transaction, decrementing by the exact
 * amount captured (rather than resetting to zero) so earnings credited between
 * the read and the write are carried forward instead of being lost.
 */
export async function runPayoutCycle(
  periodStart: Date,
  periodEnd: Date,
): Promise<PayoutCycleResult> {
  const vendors = await prisma.vendor.findMany({
    where: { status: "APPROVED", payoutBalanceCents: { gt: 0 } },
    select: { id: true },
  });

  const payouts: Payout[] = [];

  for (const { id: vendorId } of vendors) {
    const payout = await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction to capture the authoritative balance.
      const vendor = await tx.vendor.findUnique({
        where: { id: vendorId },
        select: { payoutBalanceCents: true },
      });
      const amountCents = vendor?.payoutBalanceCents ?? 0;
      if (amountCents <= 0) return null;

      const created = await tx.payout.create({
        data: {
          vendorId,
          amountCents,
          status: "PENDING",
          periodStart,
          periodEnd,
        },
      });
      await tx.vendor.update({
        where: { id: vendorId },
        data: { payoutBalanceCents: { decrement: amountCents } },
      });

      return created;
    });

    if (payout) payouts.push(payout);
  }

  return {
    payouts,
    vendorCount: payouts.length,
    totalCents: payouts.reduce((sum, payout) => sum + payout.amountCents, 0),
  };
}

/** Payout history for a vendor, newest first. */
export function getVendorPayouts(vendorId: string) {
  return prisma.payout.findMany({
    where: { vendorId },
    orderBy: { createdAt: "desc" },
  });
}
