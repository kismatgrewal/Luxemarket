import "server-only";

import crypto from "node:crypto";

import { env } from "@/lib/env";

/**
 * Outbound automation bridge to n8n.
 *
 * Domain events (a paid order, a newly onboarded vendor, a product dipping below
 * its stock threshold) are POSTed to a single n8n webhook. n8n fans them out to
 * email/Slack/CRM workflows — see `integrations/n8n`. Every request is signed
 * with an HMAC so the receiving workflow can reject spoofed traffic; the same
 * signing scheme verifies the callbacks n8n sends us (see the webhook route).
 */

/** Events LuxeMarket emits. Keep in sync with the n8n workflow switch nodes. */
export type N8nEventType = "order.paid" | "vendor.onboarded" | "product.low_stock";

/** Typed payloads per event — the compiler enforces the right shape at the call site. */
export interface N8nEventPayloads {
  "order.paid": {
    orderId: string;
    orderNumber: string;
    customerEmail: string;
    customerName: string | null;
    totalCents: number;
    currency: string;
    vendorIds: string[];
    itemCount: number;
  };
  "vendor.onboarded": {
    vendorId: string;
    storeName: string;
    slug: string;
    contactEmail: string;
    contactName: string | null;
  };
  "product.low_stock": {
    productId: string;
    title: string;
    sku: string;
    vendorId: string;
    inventory: number;
    threshold: number;
  };
}

const SIGNATURE_HEADER = "x-luxe-signature";
const TIMESTAMP_HEADER = "x-luxe-timestamp";
const EVENT_HEADER = "x-luxe-event";

/** `sha256=<hex>` over `${timestamp}.${body}`, keyed by the shared secret. */
export function signPayload(body: string, timestamp: string, secret: string): string {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `sha256=${digest}`;
}

/**
 * Constant-time verification of an inbound signature. Used by the n8n callback
 * route. Returns false (never throws) for any malformed or mismatched input.
 */
export function verifyN8nSignature(body: string, signature: string, timestamp: string): boolean {
  if (!env.N8N_WEBHOOK_SECRET || !signature || !timestamp) return false;
  const expected = signPayload(body, timestamp, env.N8N_WEBHOOK_SECRET);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Fire-and-forget an event to n8n.
 *
 * Automation must never block or fail a checkout/onboarding transaction, so this
 * resolves regardless of the webhook's outcome: misconfiguration and network
 * errors are logged, not thrown. Callers may `await` it (to flush before a
 * serverless function freezes) or let it run in the background.
 */
export async function dispatchN8nEvent<T extends N8nEventType>(
  type: T,
  payload: N8nEventPayloads[T],
): Promise<void> {
  if (!env.N8N_WEBHOOK_URL || !env.N8N_WEBHOOK_SECRET) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[n8n] skipping "${type}" — N8N_WEBHOOK_URL/SECRET not configured`);
    }
    return;
  }

  const timestamp = Date.now().toString();
  const envelope = {
    id: crypto.randomUUID(),
    type,
    createdAt: new Date().toISOString(),
    source: "luxemarket",
    data: payload,
  };
  const body = JSON.stringify(envelope);

  try {
    const res = await fetch(env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [EVENT_HEADER]: type,
        [TIMESTAMP_HEADER]: timestamp,
        [SIGNATURE_HEADER]: signPayload(body, timestamp, env.N8N_WEBHOOK_SECRET),
      },
      body,
      // Don't let a slow automation host wedge a request path.
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      console.error(`[n8n] "${type}" rejected: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.error(
      `[n8n] failed to dispatch "${type}": ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }
}
