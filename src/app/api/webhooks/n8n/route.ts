import { NextResponse } from "next/server";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { verifyN8nSignature } from "@/lib/n8n";

/**
 * Inbound n8n callback receiver.
 *
 * n8n workflows call back here to report side effects (an email queued, a Slack
 * message delivered, a fulfilment note synced). We authenticate every request
 * with the shared HMAC and record it in `WebhookEvent` keyed by the event id, so
 * a workflow's at-least-once delivery is processed exactly once.
 */

// Signature verification needs the raw, unparsed body — force the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface N8nCallback {
  id?: string;
  type?: string;
  data?: unknown;
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-luxe-signature") ?? "";
  const timestamp = request.headers.get("x-luxe-timestamp") ?? "";
  const rawBody = await request.text();

  if (!verifyN8nSignature(rawBody, signature, timestamp)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: N8nCallback;
  try {
    payload = JSON.parse(rawBody) as N8nCallback;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const eventId = payload.id;
  const type = payload.type;
  if (!eventId || !type) {
    return NextResponse.json({ error: "missing id or type" }, { status: 422 });
  }

  // Idempotency gate: create-or-fetch the ledger row for this event id.
  const existing = await prisma.webhookEvent.findUnique({ where: { eventId } });
  if (existing?.processedAt) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  const record =
    existing ??
    (await prisma.webhookEvent.create({
      data: {
        source: "n8n",
        eventId,
        type,
        payload: (payload.data ?? {}) as Prisma.InputJsonValue,
      },
    }));

  try {
    await handleN8nCallback(type, payload.data);
    await prisma.webhookEvent.update({
      where: { id: record.id },
      data: { processedAt: new Date() },
    });
  } catch (err) {
    // Leave `processedAt` null so a retry can re-run the handler.
    console.error(`[n8n webhook] failed to process "${type}" (${eventId}):`, err);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Apply a callback's side effect to our own data. Unknown types are accepted and
 * recorded (so we don't 4xx a workflow we simply don't model yet) but are no-ops.
 */
async function handleN8nCallback(type: string, data: unknown): Promise<void> {
  switch (type) {
    case "notification.sent":
    case "email.delivered":
    case "slack.notified":
      // Acknowledgement-only events: recording them in WebhookEvent is enough.
      return;

    case "shipment.tracking_updated": {
      const d = data as { orderId?: string; carrier?: string; trackingNumber?: string } | undefined;
      if (d?.orderId && d.trackingNumber) {
        await prisma.shipment.updateMany({
          where: { orderId: d.orderId, trackingNumber: d.trackingNumber },
          data: { status: "IN_TRANSIT", ...(d.carrier ? { carrier: d.carrier } : {}) },
        });
      }
      return;
    }

    default:
      return;
  }
}
