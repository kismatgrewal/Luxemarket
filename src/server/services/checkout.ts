import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * Checkout pricing and payment-intent creation.
 *
 * All amounts are integer cents. The single source of truth for how a cart
 * turns into a payable total lives here so the order service and the storefront
 * summary can never drift apart.
 */

// 8% sales tax, expressed in basis points to stay in integer math.
export const TAX_RATE_BPS = 800;
// Flat parcel rate, waived once the basket clears the free-shipping threshold.
export const FLAT_SHIPPING_CENTS = 1_200;
export const FREE_SHIPPING_THRESHOLD_CENTS = 15_000;

export interface CheckoutLineItem {
  priceCents: number;
  quantity: number;
}

export interface CheckoutTotals {
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
}

/** Break a set of line items down into subtotal, tax, shipping and total. */
export function calculateTotals(items: readonly CheckoutLineItem[]): CheckoutTotals {
  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  const taxCents = Math.round((subtotalCents * TAX_RATE_BPS) / 10_000);
  // No line items means no shipment; otherwise flat rate until the threshold.
  const shippingCents =
    subtotalCents === 0 || subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS
      ? 0
      : FLAT_SHIPPING_CENTS;

  return {
    subtotalCents,
    taxCents,
    shippingCents,
    totalCents: subtotalCents + taxCents + shippingCents,
  };
}

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

export interface PaymentIntentResult {
  orderId: string;
  orderNumber: string;
  paymentIntentId: string;
  clientSecret: string;
  amountCents: number;
  currency: string;
}

/**
 * Create a Stripe PaymentIntent for the customer's pending order.
 *
 * `createOrderFromCart` runs first and persists a PENDING order snapshot; this
 * step attaches money to it. Keeping the amount authoritative on the order (not
 * the live cart) means the webhook can reconcile payment → order by intent id,
 * and the customer is charged exactly what they were quoted.
 */
export async function createPaymentIntent(userId: string): Promise<PaymentIntentResult> {
  const order = await prisma.order.findFirst({
    where: { customerId: userId, status: "PENDING", stripePaymentIntentId: null },
    orderBy: { createdAt: "desc" },
  });

  if (!order) throw new CheckoutError("No pending order awaiting payment");
  if (order.totalCents <= 0) throw new CheckoutError("Order total must be positive");

  const intent = await stripe.paymentIntents.create({
    amount: order.totalCents,
    currency: order.currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: {
      userId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalCents: String(order.totalCents),
    },
  });

  if (!intent.client_secret) {
    throw new CheckoutError("Stripe did not return a client secret");
  }

  // Link the intent to the order and open a Payment row so the webhook has a
  // record to advance to SUCCEEDED/FAILED.
  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntentId: intent.id },
    }),
    prisma.payment.create({
      data: {
        orderId: order.id,
        stripePaymentIntentId: intent.id,
        amountCents: order.totalCents,
        currency: order.currency,
        status: "REQUIRES_PAYMENT",
      },
    }),
  ]);

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    amountCents: order.totalCents,
    currency: order.currency,
  };
}
