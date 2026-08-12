import "server-only";

import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import type { Paginated, PageParams, ReviewDTO } from "@/types";

/**
 * Product reviews.
 *
 * A customer may leave one review per product (unique `[productId, customerId]`),
 * so `addReview` is an upsert. After any write we recompute the denormalised
 * `ratingAvg`/`ratingCount` on both the product and its vendor inside a
 * transaction, keeping the aggregates that power sort/filter always consistent.
 */

export const reviewInputSchema = z.object({
  productId: z.string().min(1),
  customerId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().max(4_000).optional(),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;

/** Recompute a product's rating aggregates, then roll the change up to its vendor. */
async function recomputeRatings(tx: Prisma.TransactionClient, productId: string): Promise<void> {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { vendorId: true },
  });
  if (!product) return;

  const agg = await tx.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await tx.product.update({
    where: { id: productId },
    data: {
      ratingAvg: agg._avg.rating ?? 0,
      ratingCount: agg._count.rating,
    },
  });

  // Vendor rating is the average across all reviews of all its products.
  const vendorAgg = await tx.review.aggregate({
    where: { product: { vendorId: product.vendorId } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await tx.vendor.update({
    where: { id: product.vendorId },
    data: {
      ratingAvg: vendorAgg._avg.rating ?? 0,
      ratingCount: vendorAgg._count.rating,
    },
  });
}

export async function addReview(input: ReviewInput): Promise<ReviewDTO> {
  const data = reviewInputSchema.parse(input);

  const review = await prisma.$transaction(async (tx) => {
    const saved = await tx.review.upsert({
      where: { productId_customerId: { productId: data.productId, customerId: data.customerId } },
      create: {
        productId: data.productId,
        customerId: data.customerId,
        rating: data.rating,
        title: data.title || null,
        body: data.body || null,
      },
      update: {
        rating: data.rating,
        title: data.title || null,
        body: data.body || null,
      },
      include: { customer: { select: { name: true } } },
    });

    await recomputeRatings(tx, data.productId);
    return saved;
  });

  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    authorName: review.customer.name ?? "Verified buyer",
    createdAt: review.createdAt,
  };
}

export async function listProductReviews(
  productId: string,
  params: PageParams = {},
): Promise<Paginated<ReviewDTO>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));

  const [total, rows] = await prisma.$transaction([
    prisma.review.count({ where: { productId } }),
    prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      authorName: r.customer.name ?? "Verified buyer",
      createdAt: r.createdAt,
    })),
    page,
    pageSize,
    total,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}
