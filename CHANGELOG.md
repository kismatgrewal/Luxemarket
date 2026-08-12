# Changelog

All notable changes to LuxeMarket are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Placeholder for the next release.

## [1.4.0] - 2026-06-30

### Added
- **n8n automations**: outbound `dispatchN8nEvent()` for `order.paid`,
  `vendor.approved`, and `payout.created`, plus an inbound `/api/webhooks/n8n`
  handler for workflow callbacks (e.g. shipment/tracking updates).
- Shipment tracking timeline backed by `Shipment.events` (JSON scan log) with
  `ShipmentStatus` progression.
- Vendor payout history view with balance, period, and Stripe transfer status.

### Changed
- Both Stripe and n8n webhooks now share a single idempotency ledger
  (`WebhookEvent`), keyed by provider event id.
- Vendor dashboard KPI tiles recomputed from stored per-line earnings for
  consistency with payouts.

### Fixed
- Off-by-a-cent totals on multi-vendor orders by rounding commission once per
  line instead of on the order total.

## [1.3.0] - 2026-04-22

### Added
- **AI product descriptions**: `POST /api/products/describe` backed by OpenAI,
  guarded by `product:write`; generated copy sets `Product.aiGenerated`.
- Tone control (`editorial` / `playful` / `technical` / `minimal`) and attribute
  inputs for generation.

### Changed
- Product editor surfaces an "AI-generated" indicator and a regenerate action.

### Security
- Environment configuration validated at boot with Zod (`src/lib/env.ts`);
  production refuses to start on invalid config.

## [1.2.0] - 2026-03-10

### Added
- **Admin console with RBAC**: capability-based permissions (`src/lib/rbac.ts`),
  vendor approval/suspension queue, user management, and marketplace stats.
- `AuditLog` trail for privileged admin actions.

### Changed
- Route segments `/vendor` and `/admin` now enforce role via `requireRole`.

## [1.1.0] - 2026-02-04

### Added
- **Vendor dashboards**: store profile, product CRUD, fulfilment queue, and
  earnings overview (Recharts).
- Per-line commission and vendor earnings captured at order creation; earnings
  accrue to `Vendor.payoutBalanceCents` on payment.
- Weekly vendor payout cycle issuing Stripe Connect transfers.

### Changed
- Orders split into per-vendor `OrderItem`s to support multi-vendor baskets.

## [1.0.0] - 2025-12-15

### Added
- **Storefront**: home/featured, category browse, product detail, vendor
  storefronts, search and filtering.
- **Checkout**: server-computed totals and Stripe PaymentIntents confirmed with
  Stripe Elements; order lifecycle `PENDING → PAID` via
  `payment_intent.succeeded` webhook.
- Customer accounts (NextAuth credentials), saved addresses, cart, and order
  history.
- Reviews with denormalized product/vendor ratings.
- Core data model (Prisma/PostgreSQL) with money stored as integer cents.

[Unreleased]: https://github.com/your-org/luxemarket/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/your-org/luxemarket/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/your-org/luxemarket/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/your-org/luxemarket/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/your-org/luxemarket/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/your-org/luxemarket/releases/tag/v1.0.0
