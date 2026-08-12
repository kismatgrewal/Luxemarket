# 3. Per-line commission capture and vendor payouts

- **Status:** Accepted
- **Date:** 2025-03-04
- **Deciders:** Engineering
- **Tags:** marketplace, money, payouts, data-model

## Context

LuxeMarket is a **multi-vendor** marketplace: a single customer basket can contain
products from several vendors, but the customer pays once. The platform takes a
commission on each sale and later pays each vendor their share. This raises three
coupled questions:

1. **Where is an order's money split?** One payment, many sellers.
2. **When and how is commission computed?** Vendors have different rates
   (`Vendor.commissionBps`), and those rates can change over time.
3. **How do vendors get paid, and how do we reconcile it?**

The naive approach — store only the order total and derive each vendor's cut on
read from the vendor's *current* commission rate — breaks as soon as a rate
changes: historical orders would silently re-price, earnings reports would drift,
and past payouts would no longer reconcile.

## Decision

**Split money at the line level and capture commission at sale time.**

- **Order splitting.** `createOrderFromCart()` explodes the cart into one
  `OrderItem` per product, each carrying its own `vendorId`. The `Order` is the
  single payable unit (one Stripe PaymentIntent, one `totalCents`); the `OrderItem`
  is the unit of vendor economics and fulfilment.
- **Commission computed once, stored on the line.** At creation, each line stores
  `unitPriceCents`, `commissionCents`, and `vendorEarningsCents` as immutable
  snapshots — not values derived later from the vendor's rate:

  ```
  gross               = unitPriceCents * quantity
  commissionCents     = round(gross * vendor.commissionBps / 10000)   // bps → fraction
  vendorEarningsCents = gross - commissionCents
  ```

  `commissionBps` is basis points (default `1200` = 12%); rounding is applied once
  per line, in integer space (see [ADR 0002](./0002-money-as-integer-cents.md)).
- **Earnings accrual.** When `payment_intent.succeeded` marks the order `PAID`,
  each line's `vendorEarningsCents` accrues to `Vendor.payoutBalanceCents`.
- **Payout cycle.** A scheduled sweep creates a `Payout` (`PENDING`) per eligible
  vendor for a `periodStart`/`periodEnd` window, issues a Stripe Connect transfer,
  and records `stripeTransferId`. Transfer webhooks advance
  `PayoutStatus` (`PENDING → IN_TRANSIT → PAID`, or `FAILED`).

## Consequences

**Positive**

- **History is immutable.** Re-rating a vendor never rewrites past earnings; each
  order is a faithful financial record.
- **Clean multi-vendor splitting.** Per-line `vendorId` + economics make the
  fulfilment queue, earnings reports, and payouts a straight aggregation.
- **Auditability & reconciliation.** Payout = sum of stored line earnings for a
  period; `stripeTransferId` ties each payout back to Stripe.
- **Idempotent settlement.** Accrual runs inside the idempotent
  `payment_intent.succeeded` path (`WebhookEvent`), so a redelivered event can't
  double-credit a vendor.

**Negative / trade-offs**

- **Denormalization.** Commission/earnings are duplicated onto every line rather
  than derived; a rate-calculation bug at sale time is baked into records and
  needs a corrective migration to fix retroactively — accepted, because immutable
  history is exactly the goal.
- **Rounding is per line.** Summed line commissions can differ by a cent from
  commission computed on the order total. We deliberately treat the **line** as the
  rounding unit so each vendor's cut is self-consistent; the platform's total take
  is the sum of line commissions.
- **Payout timing complexity.** Balances, periods, refunds, and failed transfers
  must be handled; refunds after payout require balance adjustments/clawbacks.

## Alternatives considered

- **Derive commission on read from the vendor's current rate.** Zero duplication,
  but rate changes retroactively alter history and break reconciliation. Rejected.
- **Store commission only at the order level.** Loses the per-vendor split needed
  for multi-vendor baskets, fulfilment, and payouts. Rejected.
- **Stripe Connect destination charges / automatic application fees per seller.**
  Push the split into Stripe at charge time (separate transfers per vendor,
  `application_fee_amount`). Cleaner money movement, but a single customer payment
  spanning many connected accounts is awkward, ties settlement tightly to Stripe's
  model, and still requires our own line records for reporting and non-Stripe
  logic. We kept an internal ledger (`OrderItem` + `Payout`) as the source of
  truth and use Connect transfers as the payout mechanism — leaving room to move
  more of the split into Stripe later without changing our records.
- **Batch/scheduled payouts vs. instant per-order transfers.** Per-order transfers
  add fees and operational noise; periodic sweeps of accrued balances are cheaper
  and simpler to reconcile.
