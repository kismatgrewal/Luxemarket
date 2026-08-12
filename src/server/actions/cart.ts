"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { addToCart, removeCartItem, updateCartItem } from "@/server/services/cart";
import type { ActionResult, CartSummary } from "@/types";

/**
 * Thin `"use server"` wrappers over the cart service. They resolve the current
 * user, delegate to the service, then revalidate the surfaces that show cart
 * state. All heavy lifting (inventory clamping, totals) lives in the service.
 */

const addSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99).default(1),
});
const updateSchema = z.object({
  cartItemId: z.string().min(1),
  quantity: z.number().int().min(0).max(99),
});
const removeSchema = z.object({ cartItemId: z.string().min(1) });

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

function revalidateCartSurfaces(): void {
  revalidatePath("/cart");
  revalidatePath("/(storefront)", "layout");
}

export async function addToCartAction(
  input: z.input<typeof addSchema>,
): Promise<ActionResult<CartSummary>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
  const user = await requireUser();
  try {
    const cart = await addToCart(user.id, parsed.data.productId, parsed.data.quantity);
    revalidateCartSurfaces();
    return { ok: true, data: cart };
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not add to cart.");
  }
}

export async function updateCartItemAction(
  input: z.input<typeof updateSchema>,
): Promise<ActionResult<CartSummary>> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
  const user = await requireUser();
  try {
    const cart = await updateCartItem(user.id, parsed.data.cartItemId, parsed.data.quantity);
    revalidateCartSurfaces();
    return { ok: true, data: cart };
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not update the cart.");
  }
}

export async function removeCartItemAction(
  input: z.input<typeof removeSchema>,
): Promise<ActionResult<CartSummary>> {
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
  const user = await requireUser();
  try {
    const cart = await removeCartItem(user.id, parsed.data.cartItemId);
    revalidateCartSurfaces();
    return { ok: true, data: cart };
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not remove the item.");
  }
}
