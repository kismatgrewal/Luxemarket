"use server";

import { FulfillmentStatus } from "@prisma/client";
import { z } from "zod";

import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCan, ForbiddenError } from "@/lib/rbac";
import { createPaymentIntent } from "@/server/services/checkout";
import { advanceFulfillment, createOrderFromCart } from "@/server/services/orders";
import { runPayoutCycle } from "@/server/services/payouts";

/**
 * Server actions for the checkout and fulfillment flows. Each action is the
 * trust boundary: it authenticates, authorizes via RBAC, and validates input
 * with Zod before delegating to a service.
 */

const addressSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  line1: z.string().min(1, "Address is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(2, "Country is required").default("US"),
  phone: z.string().optional(),
});

/**
 * Place the customer's cart as an order and open a Stripe PaymentIntent for it.
 * The shipping address is saved (as the user's default if they have none) and
 * the order snapshots the address for fulfillment. Returns the client secret
 * the storefront needs to confirm payment.
 */
export async function createCheckout(input: z.infer<typeof addressSchema>) {
  const user = await requireUser();
  const address = addressSchema.parse(input);

  const saved = await prisma.address.create({
    data: { userId: user.id, ...address },
  });
  // First address for the user becomes their default.
  if ((await prisma.address.count({ where: { userId: user.id } })) === 1) {
    await prisma.address.update({ where: { id: saved.id }, data: { isDefault: true } });
  }

  const order = await createOrderFromCart(user.id, saved.id);
  const intent = await createPaymentIntent(user.id);

  return {
    orderNumber: order.orderNumber,
    clientSecret: intent.clientSecret,
    totalCents: intent.amountCents,
    currency: intent.currency,
  };
}

const fulfillmentSchema = z.object({
  orderItemId: z.string().min(1),
  status: z.nativeEnum(FulfillmentStatus),
});

/**
 * Advance one order line's fulfillment stage. Vendors may only touch their own
 * line items; admins may act on any.
 */
export async function updateFulfillment(input: z.infer<typeof fulfillmentSchema>) {
  const user = await requireUser();
  assertCan(user.role, "order:read:vendor");

  const { orderItemId, status } = fulfillmentSchema.parse(input);

  if (user.role !== "ADMIN") {
    const item = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: { vendor: { select: { userId: true } } },
    });
    if (!item || item.vendor.userId !== user.id) {
      throw new ForbiddenError("order:read:vendor");
    }
  }

  return advanceFulfillment(orderItemId, status);
}

const payoutCycleSchema = z
  .object({
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
  })
  .refine((v) => v.periodStart <= v.periodEnd, {
    message: "periodStart must be on or before periodEnd",
    path: ["periodStart"],
  });

/** Run a payout cycle for a settlement window. Admin only. */
export async function startPayoutCycle(input: z.infer<typeof payoutCycleSchema>) {
  const user = await requireRole("ADMIN");
  assertCan(user.role, "admin:access");

  const { periodStart, periodEnd } = payoutCycleSchema.parse(input);
  return runPayoutCycle(periodStart, periodEnd);
}
