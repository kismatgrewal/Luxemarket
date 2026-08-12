import "server-only";

import type { Prisma, Product } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  CategoryNode,
  ListProductsParams,
  Paginated,
  ProductCard,
  ProductDetail,
  ProductImageDTO,
  ProductSort,
  ReviewSummary,
  VendorStorefront,
} from "@/types";

/**
 * Catalog read model.
 *
 * The storefront only ever surfaces ACTIVE products from APPROVED vendors, so
 * that constraint is baked into every query here rather than trusted to callers.
 * All functions return the flat DTOs from `@/types`, never raw Prisma rows.
 */

const PLACEHOLDER_IMAGE = "/products/placeholder.jpg";
const DEFAULT_PAGE_SIZE = 24;

/** Product rows are always fetched with the relations the DTOs need. */
const productCardInclude = {
  images: { orderBy: { position: "asc" }, take: 1 },
  vendor: { select: { id: true, slug: true, storeName: true } },
} satisfies Prisma.ProductInclude;

type ProductCardRow = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

function primaryImage(images: { url: string; alt: string | null; position: number }[]): ProductImageDTO {
  const first = images[0];
  return {
    url: first?.url ?? PLACEHOLDER_IMAGE,
    alt: first?.alt ?? "",
    position: first?.position ?? 0,
  };
}

function discountPct(priceCents: number, compareAtCents: number | null): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.round(((compareAtCents - priceCents) / compareAtCents) * 100);
}

export function toProductCard(row: ProductCardRow): ProductCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    priceCents: row.priceCents,
    compareAtCents: row.compareAtCents,
    currency: row.currency,
    image: primaryImage(row.images),
    vendor: row.vendor,
    ratingAvg: Number(row.ratingAvg.toFixed(2)),
    ratingCount: row.ratingCount,
    inStock: row.inventory > 0,
    discountPct: discountPct(row.priceCents, row.compareAtCents),
    status: row.status,
  };
}

/** Only ACTIVE products belonging to an APPROVED vendor are publicly visible. */
const publiclyVisible: Prisma.ProductWhereInput = {
  status: "ACTIVE",
  vendor: { status: "APPROVED" },
};

const SORT_ORDER: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
  featured: [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { createdAt: "desc" }],
  newest: [{ createdAt: "desc" }],
  "price-asc": [{ priceCents: "asc" }],
  "price-desc": [{ priceCents: "desc" }],
  rating: [{ ratingAvg: "desc" }, { ratingCount: "desc" }],
};

/** Curated homepage rail: highest-rated in-stock products. */
export async function getFeaturedProducts(limit = 8): Promise<ProductCard[]> {
  const rows = await prisma.product.findMany({
    where: { ...publiclyVisible, inventory: { gt: 0 } },
    include: productCardInclude,
    orderBy: SORT_ORDER.featured,
    take: limit,
  });
  return rows.map(toProductCard);
}

export async function listProducts(params: ListProductsParams = {}): Promise<Paginated<ProductCard>> {
  const { q, categorySlug, sort = "featured", min, max } = params;
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));

  const where: Prisma.ProductWhereInput = { ...publiclyVisible };

  if (q?.trim()) {
    const term = q.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { vendor: { storeName: { contains: term, mode: "insensitive" } } },
    ];
  }
  if (categorySlug) {
    // Match the category or any of its descendants (one level is enough for our tree).
    where.category = { OR: [{ slug: categorySlug }, { parent: { slug: categorySlug } }] };
  }
  if (min != null || max != null) {
    const priceFilter: Prisma.IntFilter = {};
    if (min != null) priceFilter.gte = min;
    if (max != null) priceFilter.lte = max;
    where.priceCents = priceFilter;
  }

  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productCardInclude,
      orderBy: SORT_ORDER[sort],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items: rows.map(toProductCard),
    page,
    pageSize,
    total,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}

function buildReviewSummary(
  reviews: { rating: number }[],
  ratingAvg: number,
  ratingCount: number,
): ReviewSummary {
  const distribution: ReviewSummary["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    const bucket = Math.min(5, Math.max(1, r.rating)) as 1 | 2 | 3 | 4 | 5;
    distribution[bucket] += 1;
  }
  return { ratingAvg: Number(ratingAvg.toFixed(2)), ratingCount, distribution };
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const row = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      category: { select: { id: true, name: true, slug: true } },
      vendor: {
        select: {
          id: true,
          slug: true,
          storeName: true,
          tagline: true,
          logoUrl: true,
          ratingAvg: true,
          ratingCount: true,
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { customer: { select: { name: true } } },
      },
    },
  });

  if (!row) return null;

  const images: ProductImageDTO[] = row.images.length
    ? row.images.map((i) => ({ url: i.url, alt: i.alt ?? "", position: i.position }))
    : [{ url: PLACEHOLDER_IMAGE, alt: row.title, position: 0 }];

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    priceCents: row.priceCents,
    compareAtCents: row.compareAtCents,
    currency: row.currency,
    sku: row.sku,
    inventory: row.inventory,
    aiGenerated: row.aiGenerated,
    status: row.status,
    ratingAvg: Number(row.ratingAvg.toFixed(2)),
    ratingCount: row.ratingCount,
    inStock: row.inventory > 0,
    discountPct: discountPct(row.priceCents, row.compareAtCents),
    images,
    category: row.category,
    vendor: {
      id: row.vendor.id,
      slug: row.vendor.slug,
      storeName: row.vendor.storeName,
      tagline: row.vendor.tagline,
      logoUrl: row.vendor.logoUrl,
      ratingAvg: Number(row.vendor.ratingAvg.toFixed(2)),
      ratingCount: row.vendor.ratingCount,
    },
    reviews: row.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      authorName: r.customer.name ?? "Verified buyer",
      createdAt: r.createdAt,
    })),
    reviewSummary: buildReviewSummary(row.reviews, row.ratingAvg, row.ratingCount),
    relatedFromVendor: await listRelatedFromVendor(row.vendorId, row.id),
    createdAt: row.createdAt,
  };
}

/** Other ACTIVE listings from the same vendor, most highly rated first. */
async function listRelatedFromVendor(vendorId: string, excludeId: string): Promise<ProductCard[]> {
  const rows = await prisma.product.findMany({
    where: { ...publiclyVisible, vendorId, id: { not: excludeId } },
    include: productCardInclude,
    orderBy: SORT_ORDER.featured,
    take: 4,
  });
  return rows.map(toProductCard);
}

/** Approved vendor stores for the /vendors directory. */
export async function listApprovedVendors(limit = 36): Promise<VendorStorefront[]> {
  const vendors = await prisma.vendor.findMany({
    where: { status: "APPROVED" },
    orderBy: { ratingAvg: "desc" },
    take: limit,
    include: {
      products: {
        where: { status: "ACTIVE" },
        include: productCardInclude,
        orderBy: SORT_ORDER.featured,
        take: 4,
      },
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
    },
  });

  return vendors.map((vendor) => ({
    id: vendor.id,
    slug: vendor.slug,
    storeName: vendor.storeName,
    tagline: vendor.tagline,
    description: vendor.description,
    logoUrl: vendor.logoUrl,
    bannerUrl: vendor.bannerUrl,
    ratingAvg: Number(vendor.ratingAvg.toFixed(2)),
    ratingCount: vendor.ratingCount,
    productCount: vendor._count.products,
    memberSince: vendor.createdAt,
    products: vendor.products.map(toProductCard),
  }));
}

/** Top-level categories, each with its immediate children and live product counts. */
export async function getCategories(): Promise<CategoryNode[]> {
  const rows = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: { where: publiclyVisible } } },
      children: {
        orderBy: { name: "asc" },
        include: { _count: { select: { products: { where: publiclyVisible } } } },
      },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    imageUrl: c.imageUrl,
    productCount: c._count.products,
    children: c.children.map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
      imageUrl: child.imageUrl,
      productCount: child._count.products,
      children: [],
    })),
  }));
}

export async function getVendorStorefront(slug: string): Promise<VendorStorefront | null> {
  const vendor = await prisma.vendor.findUnique({
    where: { slug },
    include: {
      products: {
        where: { status: "ACTIVE" },
        include: productCardInclude,
        orderBy: SORT_ORDER.featured,
        take: 48,
      },
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
    },
  });

  // A suspended or unapproved store should read as "not found" to shoppers.
  if (!vendor || vendor.status !== "APPROVED") return null;

  return {
    id: vendor.id,
    slug: vendor.slug,
    storeName: vendor.storeName,
    tagline: vendor.tagline,
    description: vendor.description,
    logoUrl: vendor.logoUrl,
    bannerUrl: vendor.bannerUrl,
    ratingAvg: Number(vendor.ratingAvg.toFixed(2)),
    ratingCount: vendor.ratingCount,
    productCount: vendor._count.products,
    memberSince: vendor.createdAt,
    products: vendor.products.map(toProductCard),
  };
}

/** Narrow re-export so other services can reuse the visibility rule. */
export const CATALOG_VISIBILITY = publiclyVisible;
export type { Product };
