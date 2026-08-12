# 2. Represent money as integer minor units (cents)

- **Status:** Accepted
- **Date:** 2025-02-20
- **Deciders:** Engineering
- **Tags:** data-model, money, correctness

## Context

A marketplace does arithmetic on money constantly: cart subtotals, tax, shipping,
order totals, per-line commission, vendor earnings, and payout sweeps. These
values are summed, split across vendors, multiplied by rates, and reconciled
against Stripe — which itself denominates charges in the currency's **smallest
unit** (cents for USD).

IEEE-754 floating point cannot represent most decimal fractions exactly
(`0.1 + 0.2 !== 0.3`). Accumulated across many lines and rounding steps, this
produces off-by-a-cent totals and payouts that don't reconcile — unacceptable for
anything financial. We needed a representation that is exact, cheap, portable
across Postgres/Prisma/TypeScript/Stripe, and hard to misuse.

## Decision

Store and compute **all monetary values as integers in the currency's minor unit
(cents)**.

- Schema columns are `Int` and suffixed `*Cents` — `priceCents`,
  `compareAtCents`, `subtotalCents`, `taxCents`, `shippingCents`, `totalCents`,
  `unitPriceCents`, `commissionCents`, `vendorEarningsCents`, `amountCents`,
  `payoutBalanceCents`.
- A separate `currency` field (default `"USD"`) records the denomination; the
  integer is always minor units of that currency.
- All arithmetic (sums, commission, splits) is done in integer space. Rounding,
  where unavoidable (commission), is applied **once per line** with `Math.round`.
- Formatting to a human string happens **only at the display edge** via
  `formatMoney(cents, currency)` in `src/lib/utils.ts`
  (`Intl.NumberFormat`, dividing by 100).
- Floats are never used for money, and `Prisma.Decimal`/`Float` money columns are
  disallowed by convention.

## Consequences

**Positive**

- Exact arithmetic: no binary-fraction drift; totals and payouts reconcile to the
  cent.
- Direct parity with Stripe, which expects integer minor units — no conversion
  bugs at the payments boundary.
- `Int` is compact and fast to index/sum in Postgres.
- The `*Cents` naming makes the unit obvious at every call site and in code review.

**Negative / trade-offs**

- Developers must remember to divide by 100 for display and never do it anywhere
  else — mitigated by funneling all formatting through `formatMoney`.
- Zero-decimal currencies (e.g. JPY) and three-decimal currencies (e.g. BHD) have
  a different minor-unit scale; the `currency` field is required to interpret the
  integer correctly if we expand beyond USD.
- `Int` (32-bit) caps a single value near ±21.4 million dollars — fine for
  per-order amounts; aggregate reporting should sum in a wider type (`BigInt`) if
  ever needed.

## Alternatives considered

- **Floating-point (`Float`/JS `number` as dollars).** Simplest to read, but
  inexact for decimals and the classic source of financial rounding bugs.
  Rejected outright.
- **Arbitrary-precision decimal (`Prisma.Decimal` / Postgres `NUMERIC`).** Exact
  and semantically "money-like," but heavier to compute with, serializes as
  strings/objects across the RSC and API boundaries, and still needs conversion to
  Stripe's integer minor units. More ceremony than the problem warrants for a
  single-currency-first product.
- **A money value object / library (e.g. dinero.js).** Encapsulates unit + amount
  nicely and prevents mixing currencies, but adds a dependency and a wrapper type
  that must cross the server/client boundary. We kept the primitive `Int` + a
  formatting helper and can adopt a value object later without a data migration
  (the storage is already minor units).
