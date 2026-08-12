import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { calculateTotals } from "@/server/services/checkout";
import type { CartLine, CartSummary, CartTotals } from "@/types";

/**
 * Cart read/write model.
 *
 * A user has at most one cart (enforced by a unique `userId`). Quantities are
 * clamped to available inventory on write so a shopper can never queue more
 * than a vendor can ship. Totals reuse the checkout calculator so the estimate
 * shown in the mini-cart/cart page can never drift from the final charge.
 */

const cartInclude = {
  items: {
    orderBy: { product: { title: "asc" } },
    include: {
      product: {
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          vendor: { select: { storeName: true } },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartRow = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

/**
 * Pure totals calculator. Exposed for the checkout flow and unit tests; takes
 * the minimal line shape so it never needs a full cart row.
 */
export function computeCartTotals(
  items: { unitPriceCents: number; quantity: number }[],
  currency = "USD",
): CartTotals {
  const totals = calculateTotals(
    items.map((item) => ({ priceCents: item.unitPriceCents, quantity: item.quantity })),
  );
  return {
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    ...totals,
    currency,
  };
}

function toCartLine(item: CartRow["items"][number]): CartLine {
  const { product } = item;
  const image = product.images[0];
  return {
    cartItemId: item.id,
    productId: product.id,
    slug: product.slug,
    title: product.title,
    vendorName: product.vendor.storeName,
    currency: product.currency,
    image: {
      url: image?.url ?? "/products/placeholder.jpg",
      alt: image?.alt ?? product.title,
      position: image?.position ?? 0,
    },
    unitPriceCents: product.priceCents,
    quantity: item.quantity,
    lineTotalCents: product.priceCents * item.quantity,
    inventory: product.inventory,
    overStock: item.quantity > product.inventory,
  };
}

function toCartSummary(cart: CartRow | null): CartSummary {
  const lines = cart?.items.map(toCartLine) ?? [];
  const currency = cart?.items[0]?.product.currency ?? "USD";
  return {
    id: cart?.id ?? null,
    items: lines,
    totals: computeCartTotals(lines, currency),
  };
}

/** Fetch the user's cart (creating an empty one if needed) as a view model. */
export async function getCart(userId: string): Promise<CartSummary> {
  const cart = await prisma.cart.findUnique({ where: { userId }, include: cartInclude });
  return toCartSummary(cart);
}

async function ensureCartId(userId: string): Promise<string> {
  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });
  return cart.id;
}

/**
 * Add `qty` of a product to the cart, merging with any existing line. The
 * resulting quantity is capped at the product's available inventory.
 */
export async function addToCart(userId: string, productId: string, qty = 1): Promise<CartSummary> {
  const quantity = Math.max(1, Math.floor(qty));

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, inventory: true, status: true },
  });
  if (!product || product.status !== "ACTIVE") {
    throw new Error("This product is not available for purchase.");
  }
  if (product.inventory <= 0) {
    throw new Error("This product is out of stock.");
  }

  const cartId = await ensureCartId(userId);
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId, productId } },
    select: { quantity: true },
  });

  const nextQty = Math.min(product.inventory, (existing?.quantity ?? 0) + quantity);

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    create: { cartId, productId, quantity: nextQty },
    update: { quantity: nextQty },
  });

  return getCart(userId);
}

/** Set an absolute quantity for a line; a quantity of 0 removes it. */
export async function updateCartItem(
  userId: string,
  cartItemId: string,
  quantity: number,
): Promise<CartSummary> {
  const item = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cart: { userId } },
    include: { product: { select: { inventory: true } } },
  });
  if (!item) throw new Error("Cart item not found.");

  const next = Math.floor(quantity);
  if (next <= 0) {
    await prisma.cartItem.delete({ where: { id: cartItemId } });
    return getCart(userId);
  }

  await prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity: Math.min(next, item.product.inventory) },
  });
  return getCart(userId);
}

/** Remove a single line, verifying it belongs to the caller. */
export async function removeCartItem(userId: string, cartItemId: string): Promise<CartSummary> {
  await prisma.cartItem.deleteMany({ where: { id: cartItemId, cart: { userId } } });
  return getCart(userId);
}

/** Empty the cart (used after a successful checkout). */
export async function clearCart(userId: string): Promise<void> {
  const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}
