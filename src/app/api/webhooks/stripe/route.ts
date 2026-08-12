import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { markOrderPaid } from "@/server/services/orders";

// Signature verification needs the raw, unparsed body, so opt out of any
// caching/static optimization and run on Node (crypto + Prisma).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // `req.text()` yields the exact bytes Stripe signed — do not JSON.parse first.
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        // markOrderPaid is idempotent, so redelivered events are safe.
        await markOrderPaid(intent.id);
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { status: "FAILED" },
        });
        break;
      }
      default:
        // Unhandled types are acknowledged so Stripe stops retrying them.
        break;
    }
  } catch (err) {
    // Signal a retriable failure — Stripe will redeliver, and our idempotency
    // guards make the reprocess safe.
    console.error(`Stripe webhook handler failed for ${event.type} (${event.id}):`, err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
