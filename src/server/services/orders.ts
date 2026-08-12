import { randomBytes } from "node:crypto";

import { Prisma, type FulfillmentStatus, type OrderStatus } from "@prisma/client";

import { dispatchN8nEvent } from "@/lib/n8n";
import { prisma } from "@/lib/prisma";
import { calculateTotals } from "@/server/services/checkout";

/**
 * Order lifecycle: PENDING → PAID → FULFILLED → SHIPPED → DELIVERED.
 *
 * A single order can span multiple vendors, so the marketplace commission is
 * computed and stored per line item at purchase time. All amounts are cents.
 */

export class OrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderError";
  }
}

// Crockford base32 without look-alikes (I, L, O, U) — readable when spoken.
const ORDER_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Human-friendly, hard-to-guess order reference, e.g. `LM-2K5F8A`. */
function generateOrderNumber(): string {
  let suffix = "";
  for (const byte of randomBytes(6)) {
    suffix += ORDER_ALPHABET[byte % ORDER_ALPHABET.length]!;
  }
  return `LM-${suffix}`;
}

/**
 * Turn the customer's cart into a PENDING order.
 *
 * Runs in a single transaction: validate stock, compute per-vendor commission,
 * reserve inventory, and empty the cart so a double submit can't reorder. The
 * order is created unpaid; payment is attached separately via the checkout
 * service and confirmed by the Stripe webhook.
 */
export async function createOrderFromCart(userId: string, addressId: string) {
  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: { include: { vendor: true } } } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new OrderError("Your cart is empty");
    }

    // The shipping address must belong to the buyer.
    const address = await tx.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new OrderError("Invalid shipping address");

    const lineItems = cart.items.map((item) => {
      const { product } = item;
      if (product.status !== "ACTIVE") {
        throw new OrderError(`"${product.title}" is no longer available`);
      }
      if (product.inventory < item.quantity) {
        throw new OrderError(`Only ${product.inventory} left of "${product.title}"`);
      }

      const grossCents = product.priceCents * item.quantity;
      // Commission is rounded once, at the line level, so vendor earnings and
      // marketplace revenue always reconcile to the gross.
      const commissionCents = Math.round((grossCents * product.vendor.commissionBps) / 10_000);

      return {
        title: product.title,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        commissionCents,
        vendorEarningsCents: grossCents - commissionCents,
        product: { connect: { id: product.id } },
        vendor: { connect: { id: product.vendorId } },
      };
    });

    const totals = calculateTotals(
      cart.items.map((item) => ({
        priceCents: item.product.priceCents,
        quantity: item.quantity,
      })),
    );

    const currency = cart.items[0]?.product.currency ?? "USD";

    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId: userId,
        status: "PENDING",
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        shippingCents: totals.shippingCents,
        totalCents: totals.totalCents,
        currency,
        shippingAddressId: address.id,
        items: { create: lineItems },
      },
      include: { items: true },
    });

    // Reserve stock and clear the cart within the same transaction.
    for (const item of cart.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { inventory: { decrement: item.quantity } },
      });
    }
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return order;
  });
}

/**
 * Settle a paid order. Idempotent: a WebhookEvent row keyed on the payment
 * intent guards against a redelivered webhook double-crediting vendors. On the
 * real PENDING → PAID transition we credit each vendor's payout balance and
 * fan the event out to n8n.
 */
export async function markOrderPaid(paymentIntentId: string) {
  const idempotencyKey = `order-paid:${paymentIntentId}`;

  interface SettledOrder {
    id: string;
    orderNumber: string;
    totalCents: number;
    currency: string;
    customerEmail: string;
    customerName: string | null;
    vendorIds: string[];
    itemCount: number;
  }
  let result: { transitioned: boolean; order: SettledOrder | null };

  try {
    result = await prisma.$transaction(async (tx) => {
      const seen = await tx.webhookEvent.findUnique({ where: { eventId: idempotencyKey } });
      if (seen?.processedAt) return { transitioned: false, order: null };

      const order = await tx.order.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
        include: { items: true, customer: { select: { email: true, name: true } } },
      });
      if (!order) throw new OrderError(`No order for payment intent ${paymentIntentId}`);

      // Anything past PENDING is a replay of an already-settled payment.
      if (order.status !== "PENDING") {
        await tx.webhookEvent.create({
          data: {
            source: "stripe",
            eventId: idempotencyKey,
            type: "order.paid",
            payload: { paymentIntentId, orderId: order.id, replay: true },
            processedAt: new Date(),
          },
        });
        return { transitioned: false, order: null };
      }

      await tx.order.update({ where: { id: order.id }, data: { status: "PAID" } });
      await tx.payment.updateMany({
        where: { stripePaymentIntentId: paymentIntentId },
        data: { status: "SUCCEEDED" },
      });

      // Aggregate earnings per vendor, then credit each payout balance once.
      const earningsByVendor = new Map<string, number>();
      for (const item of order.items) {
        earningsByVendor.set(
          item.vendorId,
          (earningsByVendor.get(item.vendorId) ?? 0) + item.vendorEarningsCents,
        );
      }
      for (const [vendorId, cents] of earningsByVendor) {
        await tx.vendor.update({
          where: { id: vendorId },
          data: { payoutBalanceCents: { increment: cents } },
        });
      }

      // Committing this row is what makes the credit idempotent; the unique
      // constraint also serializes two racing deliveries (see the catch below).
      await tx.webhookEvent.create({
        data: {
          source: "stripe",
          eventId: idempotencyKey,
          type: "order.paid",
          payload: {
            paymentIntentId,
            orderId: order.id,
            orderNumber: order.orderNumber,
            totalCents: order.totalCents,
          },
          processedAt: new Date(),
        },
      });

      return {
        transitioned: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          totalCents: order.totalCents,
          currency: order.currency,
          customerEmail: order.customer.email,
          customerName: order.customer.name,
          vendorIds: [...earningsByVendor.keys()],
          // Total units purchased across all line items.
          itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        },
      };
    });
  } catch (err) {
    // A concurrent delivery already inserted the idempotency row — treat this
    // one as a no-op rather than an error.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { orderId: null, transitioned: false };
    }
    throw err;
  }

  // Fan out only after the ledger commits, and only for a real transition, so
  // a downstream failure can't roll back the payment settlement.
  if (result.transitioned && result.order) {
    await dispatchN8nEvent("order.paid", {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      customerEmail: result.order.customerEmail,
      customerName: result.order.customerName,
      totalCents: result.order.totalCents,
      currency: result.order.currency,
      vendorIds: result.order.vendorIds,
      itemCount: result.order.itemCount,
    });
  }

  return { orderId: result.order?.id ?? null, transitioned: result.transitioned };
}

/** Every order for a customer, newest first, with line items and shipments. */
export function listCustomerOrders(userId: string) {
  return prisma.order.findMany({
    where: { customerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: {
            select: { images: { orderBy: { position: "asc" }, take: 1 } },
          },
        },
      },
      shipments: true,
    },
  });
}

/** A single order by its human reference, hydrated for the detail view. */
export function getOrderByNumber(orderNumber: string) {
  return prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: { include: { product: { include: { images: true } }, vendor: true } },
      shippingAddress: true,
      payment: true,
      shipments: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Fulfillment
// ---------------------------------------------------------------------------

// Ordered stages; index gives us a cheap "moves forward only" comparison.
const FULFILLMENT_STAGES: FulfillmentStatus[] = ["UNFULFILLED", "PACKED", "SHIPPED", "DELIVERED"];
const PAID_STATES = new Set<OrderStatus>(["PAID", "FULFILLED", "SHIPPED", "DELIVERED"]);

/** Roll the parent order up to reflect its least-advanced line item. */
function rollUpOrderStatus(minStageIndex: number): OrderStatus {
  switch (minStageIndex) {
    case 3:
      return "DELIVERED";
    case 2:
      return "SHIPPED";
    case 1:
      return "FULFILLED";
    default:
      return "PAID";
  }
}

/**
 * Advance a single line item's fulfillment and reconcile the parent order.
 *
 * Fulfillment only moves forward and only after the order is paid. The order's
 * status tracks the slowest line, so it flips to SHIPPED once every item has
 * shipped, DELIVERED once every item has arrived, and so on.
 */
export async function advanceFulfillment(orderItemId: string, status: FulfillmentStatus) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: { select: { id: true, status: true } } },
    });
    if (!item) throw new OrderError("Order item not found");
    if (!PAID_STATES.has(item.order.status)) {
      throw new OrderError("Order must be paid before it can be fulfilled");
    }

    const current = FULFILLMENT_STAGES.indexOf(item.fulfillmentStatus);
    const next = FULFILLMENT_STAGES.indexOf(status);
    if (next <= current) {
      throw new OrderError(`Cannot move fulfillment from ${item.fulfillmentStatus} to ${status}`);
    }

    await tx.orderItem.update({
      where: { id: orderItemId },
      data: { fulfillmentStatus: status },
    });

    const siblings = await tx.orderItem.findMany({
      where: { orderId: item.orderId },
      select: { fulfillmentStatus: true },
    });
    const minStage = Math.min(
      ...siblings.map((s) => FULFILLMENT_STAGES.indexOf(s.fulfillmentStatus)),
    );
    const rolledUp = rollUpOrderStatus(minStage);
    if (rolledUp !== item.order.status) {
      await tx.order.update({ where: { id: item.orderId }, data: { status: rolledUp } });
    }

    return tx.orderItem.findUniqueOrThrow({ where: { id: orderItemId } });
  });
}
