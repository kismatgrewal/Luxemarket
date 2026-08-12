# LuxeMarket × n8n

LuxeMarket offloads transactional side effects — order confirmations, vendor
welcome emails, Slack pings, CRM sync — to [n8n](https://n8n.io) instead of
wiring them into the request path. The app emits **signed domain events**; n8n
receives them, fans them out, and can call back into the app with results.

```
LuxeMarket  ──POST (HMAC-signed)──▶  n8n Webhook  ──▶  Email · Slack · CRM
    ▲                                                          │
    └──────────  POST /api/webhooks/n8n (HMAC-signed) ◀────────┘
                         (idempotent callback)
```

## Events emitted by the app

Emitted from `src/lib/n8n.ts` via `dispatchN8nEvent(type, payload)`:

| Event                | Fired when                                   | Key payload fields                                             |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| `order.paid`         | A Stripe payment for an order succeeds        | `orderNumber`, `customerEmail`, `totalCents`, `itemCount`, `vendorIds` |
| `vendor.onboarded`   | An admin approves a vendor application        | `storeName`, `slug`, `contactEmail`, `contactName`            |
| `product.low_stock`  | A product is (re)published at/under threshold | `productId`, `sku`, `inventory`, `threshold`, `vendorId`      |

Every request carries these headers:

- `x-luxe-event` — the event type (used by the workflow's IF/Switch node).
- `x-luxe-timestamp` — millisecond epoch, part of the signed material.
- `x-luxe-signature` — `sha256=<hex>` of `HMAC-SHA256(secret, "{timestamp}.{body}")`.

The request body is the envelope `{ id, type, createdAt, source, data }`.

## Included workflows

| File                                | Trigger event      | What it does                                                            |
| ----------------------------------- | ------------------ | ---------------------------------------------------------------------- |
| `order-notification.workflow.json`  | `order.paid`       | Emails the customer a confirmation, posts to `#orders`, acks the app.  |
| `vendor-onboarding.workflow.json`   | `vendor.onboarded` | Emails the new vendor, posts to `#vendor-ops`, creates a CRM contact.  |

Both share the webhook path `luxemarket-events`, so a single ingress URL
receives all events and each workflow's IF node filters for the type it handles.

## Setup

1. **Import** — in n8n: *Workflows → Import from File* for each `*.workflow.json`.
2. **Credentials** — create and attach:
   - `LuxeMarket SMTP` (SMTP) for the Email nodes.
   - `LuxeMarket Slack` (Slack API) for the Slack nodes; invite the bot to
     `#orders` and `#vendor-ops`.
3. **Environment variables** (n8n host):
   - `N8N_WEBHOOK_SECRET` — must equal the app's `N8N_WEBHOOK_SECRET`.
   - `LUXE_APP_URL` — e.g. `https://luxemarket.com` (used for callbacks & links).
   - `CRM_WEBHOOK_URL` — your CRM intake endpoint (vendor-onboarding only).
4. **Activate** each workflow. Copy the production webhook URL from the Webhook
   node — it looks like `https://<your-n8n>/webhook/luxemarket-events`.
5. **Point the app at n8n** — in LuxeMarket's `.env`:

   ```env
   N8N_WEBHOOK_URL="https://<your-n8n>/webhook/luxemarket-events"
   N8N_WEBHOOK_SECRET="<the-same-shared-secret>"
   ```

## Verifying the signature inside n8n

Add a **Code** node before any trusted action to reject spoofed calls:

```js
const crypto = require("crypto");
const ts = $json.headers["x-luxe-timestamp"];
const sig = $json.headers["x-luxe-signature"];
const body = $json.rawBody; // enable "Raw Body" on the Webhook node
const expected =
  "sha256=" +
  crypto.createHmac("sha256", $env.N8N_WEBHOOK_SECRET).update(`${ts}.${body}`).digest("hex");
if (sig !== expected) throw new Error("Invalid LuxeMarket signature");
return $input.all();
```

## Callbacks into the app

Workflows may report results back to `POST /api/webhooks/n8n`
(`src/app/api/webhooks/n8n/route.ts`). Sign the callback with the **same**
scheme and include a stable `id` — the route records every event in the
`WebhookEvent` table and **processes each id exactly once**, so n8n's
at-least-once retries are safe. Recognised callback types include
`notification.sent`, `email.delivered`, `slack.notified`, and
`shipment.tracking_updated`; unknown types are accepted and recorded as no-ops.

## Local development

Expose your dev server (`ngrok http 3000`) and set `LUXE_APP_URL` to the tunnel
so callbacks reach `localhost`. With `N8N_WEBHOOK_URL` unset the app logs a
skip notice instead of dispatching, so nothing breaks when n8n isn't running.
