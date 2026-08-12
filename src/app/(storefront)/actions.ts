"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { addToCart, updateCartItem, removeCartItem } from "@/server/services/cart";

/**
 * Server actions backing the storefront's interactive cart controls
 * (AddToCartButton, CartLineItem). Each resolves the signed-in user, mutates
 * through the cart service, and revalidates the affected routes. When no user
 * is present the action returns a typed signal so the client can prompt a
 * sign-in rather than throwing.
 */

export type CartActionResult =
  | { ok: true }
  | { ok: false; error: "SIGN_IN_REQUIRED" | "FAILED"; message?: string };

export async function addItemToCartAction(
  productId: string,
  quantity = 1,
): Promise<CartActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SIGN_IN_REQUIRED" };

  try {
    await addToCart(user.id, productId, Math.max(1, quantity));
    revalidatePath("/cart");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "FAILED", message: (err as Error).message };
  }
}

export async function updateCartItemAction(
  itemId: string,
  quantity: number,
): Promise<CartActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SIGN_IN_REQUIRED" };

  try {
    await updateCartItem(user.id, itemId, Math.max(1, quantity));
    revalidatePath("/cart");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "FAILED", message: (err as Error).message };
  }
}

export async function removeCartItemAction(itemId: string): Promise<CartActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SIGN_IN_REQUIRED" };

  try {
    await removeCartItem(user.id, itemId);
    revalidatePath("/cart");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "FAILED", message: (err as Error).message };
  }
}
