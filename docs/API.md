# API Reference

> LuxeMarket exposes two surfaces: a small set of **HTTP route handlers**
> (`src/app/api/**`) for machine callers — authentication, webhooks, health, and
> the AI copy helper — and a larger **Server Action / service** surface
> (`src/server/**`) that the app itself calls for reads and mutations. This
> document covers both.
>
> Conventions: all request/response bodies are JSON unless noted; all monetary
> values are integer **cents**; all external input is validated with Zod; every
> privileged operation is guarded by [`assertCan`](./ARCHITECTURE.md#4-rbac-model).

---

## Conventions

| Aspect | Rule |
| --- | --- |
| Base URL | `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`) |
| Content type | `application/json` (except the Stripe webhook, which reads the **raw** body) |
| Money | integer cents (`totalCents`, `amountCents`, …) |
| Auth (browser) | NextAuth session cookie |
| Auth (webhooks) | provider signature / shared secret — never session cookies |
| Errors | `{ "error": { "code": string, "message": string } }` with an appropriate HTTP status |

### Standard error shape

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Missing permission: product:write"
  }
}
```

| Status | `code` | When |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Zod validation failed |
| 401 | `UNAUTHENTICATED` | No/invalid session |
| 403 | `FORBIDDEN` | Authenticated but lacks the permission |
| 404 | `NOT_FOUND` | Resource missing or not owned by caller |
| 409 | `CONFLICT` | Idempotency / unique-constraint conflict |
| 500 | `INTERNAL` | Unexpected error |

---

## HTTP route handlers

### `GET /api/health`

Liveness/readiness probe. Checks process health and database connectivity. Used by
uptime monitors, container orchestrators, and CI smoke tests.

**Response `200`**
```json
{ "status": "ok", "db": "up", "uptime": 1287.4, "version": "1.4.0" }
```

**Response `503`** — dependency unavailable
```json
{ "status": "degraded", "db": "down" }
```

---

### `POST /api/auth/[...nextauth]` · `GET /api/auth/[...nextauth]`

NextAuth catch-all handler (credentials provider + Prisma adapter). Serves
sign-in, sign-out, session, and CSRF endpoints. Configuration lives in
`authOptions` (`src/lib/auth.ts`).

**Sign in (credentials)** — `POST /api/auth/callback/credentials`
```jsonc
// form-encoded or JSON, per NextAuth
{ "email": "buyer@example.com", "password": "••••••••", "csrfToken": "…" }
```

**Session** — `GET /api/auth/session`
```json
{
  "user": { "id": "clx…", "email": "buyer@example.com", "name": "Ada", "role": "CUSTOMER" },
  "expires": "2026-08-09T12:00:00.000Z"
}
```

Prefer the framework helpers over calling these directly:
`getCurrentUser()`, `requireUser()`, `requireRole(role)` from `src/lib/auth.ts`.

---

### `POST /api/webhooks/stripe`

Receives Stripe events. **Reads the raw request body** and verifies the
`Stripe-Signature` header against `STRIPE_WEBHOOK_SECRET`. Every event is recorded
in `WebhookEvent` for idempotency before side effects run.

**Handled events**

| Event | Effect |
| --- | --- |
| `payment_intent.succeeded` | `markOrderPaid(paymentIntentId)` → order `PAID`, accrue vendor earnings |
| `payment_intent.payment_failed` | order → `CANCELLED` |
| `charge.refunded` | order → `REFUNDED` |
| `transfer.paid` / `transfer.failed` | advance `Payout.status` |

**Request headers**
```
Stripe-Signature: t=1720612800,v1=5257a869e7…
Content-Type: application/json
```

**Response `200`** — processed or de-duplicated
```json
{ "received": true }
```

**Response `400`** — signature verification failed
```json
{ "error": { "code": "BAD_REQUEST", "message": "Invalid Stripe signature" } }
```

> Idempotency: a redelivered event whose `eventId` already has `processedAt` set
> returns `200 { "received": true, "duplicate": true }` without re-running effects.

---

### `POST /api/webhooks/n8n`

Inbound callbacks from n8n workflows (e.g. a shipment/tracking update pushed back
into the app). Authenticated with a shared secret (`N8N_WEBHOOK_SECRET`, sent as a
header) and de-duplicated via `WebhookEvent` (`source: "n8n"`).

**Request**
```jsonc
// header: X-N8N-Signature: <hmac or shared secret>
{
  "eventId": "n8n_evt_9f2c",
  "type": "shipment.updated",
  "payload": {
    "orderNumber": "LM-2026-000517",
    "carrier": "UPS",
    "trackingNumber": "1Z999AA10123456784",
    "status": "IN_TRANSIT"
  }
}
```

**Response `200`**
```json
{ "received": true }
```

**Response `401`** — bad secret
```json
{ "error": { "code": "UNAUTHENTICATED", "message": "Invalid webhook secret" } }
```

Outbound dispatch (app → n8n) is not an HTTP endpoint here; it is
`dispatchN8nEvent(type, payload)` from `src/lib/n8n.ts`, which POSTs to
`N8N_WEBHOOK_URL`. Typical emitted types: `order.paid`, `vendor.approved`,
`payout.created`.

---

### `POST /api/products/describe`

Generates marketing copy for a product with OpenAI. Guarded by `product:write`
(vendors and admins). Products saved with the returned text set
`Product.aiGenerated = true`.

**Auth:** session cookie · requires permission `product:write`

**Request body**
```json
{
  "title": "Heritage Leather Weekender",
  "category": "Bags & Luggage",
  "attributes": ["full-grain leather", "brass hardware", "45L", "handmade"],
  "tone": "editorial"
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `title` | `string` | required |
| `category` | `string` | optional — improves relevance |
| `attributes` | `string[]` | optional — bullet inputs |
| `tone` | `"editorial" \| "playful" \| "technical" \| "minimal"` | optional, default `"editorial"` |

**Response `200`**
```json
{
  "description": "Cut from a single hide of full-grain leather and finished with…",
  "model": "gpt-4o-mini",
  "aiGenerated": true
}
```

**Errors:** `400` invalid body · `401` unauthenticated · `403` missing
`product:write` · `502` upstream OpenAI error.

**Example**
```bash
curl -X POST "$NEXT_PUBLIC_APP_URL/api/products/describe" \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION_COOKIE" \
  -d '{"title":"Heritage Leather Weekender","tone":"editorial"}'
```

---

## Server Actions & services

Most user-facing behavior is **not** REST — it flows through React Server Actions
that call typed domain services. These are invoked from server components and
forms, not fetched over HTTP. Signatures below reflect the service contract in
`src/server/services/*`; actions in `src/server/actions/*` wrap them with Zod
validation and `assertCan` guards.

### `catalog` — `src/server/services/catalog.ts`

| Function | Purpose |
| --- | --- |
| `getFeaturedProducts(limit?)` | Homepage featured grid |
| `listProducts({ q?, categorySlug?, sort?, min?, max?, page? })` | Filtered/paged listing |
| `getProductBySlug(slug)` | Product detail (images, vendor, reviews) |
| `getCategories()` | Category tree for navigation |
| `getVendorStorefront(slug)` | Public vendor store + their active products |

```ts
// Reads run inside server components — no client fetch:
const products = await listProducts({ categorySlug: "lighting", sort: "price_desc", page: 1 });
```

### `cart` — `src/server/services/cart.ts`

| Function | Purpose |
| --- | --- |
| `getCart(userId)` | Current cart with line items |
| `addToCart(userId, productId, qty)` | Add/increment a line |
| `updateCartItem(userId, itemId, qty)` | Change quantity |
| `removeCartItem(userId, itemId)` | Remove a line |
| `computeCartTotals(items)` | Subtotal from line prices (cents) |

### `checkout` — `src/server/services/checkout.ts`

| Function | Purpose |
| --- | --- |
| `calculateTotals(items)` | Returns `{ subtotalCents, taxCents, shippingCents, totalCents }` |
| `createPaymentIntent(userId)` | Creates the Stripe PaymentIntent for the cart |

```ts
// createPaymentIntent → the browser confirms with Stripe Elements:
const { clientSecret, totalCents } = await createPaymentIntent(user.id);
```

### `orders` — `src/server/services/orders.ts`

| Function | Purpose |
| --- | --- |
| `createOrderFromCart(userId, addressId)` | Splits cart into per-vendor `OrderItem`s, computes commission, creates `PENDING` order |
| `markOrderPaid(paymentIntentId)` | Idempotent transition `PENDING → PAID`; accrues vendor earnings |
| `listCustomerOrders(userId)` | Order history |
| `getOrderByNumber(orderNumber)` | Single order (ownership-scoped) |
| `advanceFulfillment(orderItemId, status)` | Advance a line's `FulfillmentStatus`; rolls the order status up |

Commission per line (integer math):
```
gross               = unitPriceCents * quantity
commissionCents     = round(gross * vendor.commissionBps / 10000)
vendorEarningsCents = gross - commissionCents
```
See [ADR 0003](./adr/0003-per-line-commission-and-vendor-payouts.md).

### `vendors` — `src/server/services/vendors.ts`

| Function | Guard | Purpose |
| --- | --- | --- |
| `getVendorDashboardStats(vendorId)` | `order:read:vendor` | KPI tiles (sales, orders, balance) |
| `listVendorProducts(vendorId)` | `product:write` | Vendor catalog |
| `listVendorOrders(vendorId)` | `order:read:vendor` | Fulfilment queue (lines for this vendor) |
| `getVendorPayouts(vendorId)` | `payout:read:own` | Payout history + balance |

### `admin` — `src/server/services/admin.ts`

| Function | Guard | Purpose |
| --- | --- | --- |
| `getMarketplaceStats()` | `admin:access` | GMV, order, vendor, user metrics |
| `listPendingVendors()` | `vendor:approve` | Approval queue |
| `approveVendor(id)` | `vendor:approve` | `PENDING → APPROVED` (+ audit log, `vendor.approved` event) |
| `suspendVendor(id)` | `vendor:approve` | `APPROVED → SUSPENDED` |
| `listUsers()` | `user:manage` | User directory |
| `listAllOrders()` | `order:read:all` | Every order |

### Action example (mutation from a form)

```ts
"use server";
import { assertCan } from "@/lib/rbac";
import { requireUser } from "@/lib/auth";
import { approveVendor } from "@/server/services/admin";

export async function approveVendorAction(vendorId: string) {
  const user = await requireUser();
  assertCan(user.role, "vendor:approve"); // throws ForbiddenError → 403
  await approveVendor(vendorId);
  // revalidatePath("/admin/vendors")
}
```

---

## Rate limits & idempotency

- **Webhooks** are idempotent by design (`WebhookEvent.eventId`) — safe to retry.
- **AI generation** (`/api/products/describe`) is the most expensive endpoint;
  callers should debounce and cache results, and it is restricted to
  `product:write` holders.
- **PaymentIntents** are created server-side from the authoritative cart, so a
  client cannot tamper with amounts.
