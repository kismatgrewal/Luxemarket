"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addReview } from "@/server/services/reviews";
import type { ActionResult, ReviewDTO } from "@/types";

/**
 * `"use server"` wrapper for leaving a product review. The customer id always
 * comes from the authenticated session — never the client — so a shopper can
 * only review as themselves.
 */

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().max(4_000).optional(),
});

export async function addReviewAction(
  input: z.input<typeof reviewSchema>,
): Promise<ActionResult<ReviewDTO>> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please choose a rating and try again.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const user = await requireUser();
  try {
    // Resolve the slug up front so we can revalidate the product page after write.
    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
      select: { slug: true },
    });
    if (!product) return { ok: false, error: "Product not found." };

    const review = await addReview({ ...parsed.data, customerId: user.id });

    revalidatePath(`/(storefront)/product/${product.slug}`);
    return { ok: true, data: review };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not submit your review." };
  }
}
