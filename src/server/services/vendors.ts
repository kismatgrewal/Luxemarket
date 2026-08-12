import "server-only";

import type { FulfillmentStatus, OrderStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  DashboardStats,
  DayKey,
  PayoutRow,
  SalesPoint,
  TopProduct,
  VendorOrderLine,
  VendorOrderSummary,
  VendorProductRow,
} from "@/types";

/**
 * Vendor console read model — headline metrics, chart series and the working
 * lists behind the seller dashboard.
 *
 * Revenue is only recognised once an order is paid, so every money figure is
 * derived from order items whose parent order has reached PAID or beyond.
 */

/** Order statuses at which revenue is considered earned by the vendor. */
const REVENUE_STATUSES: OrderStatus[] = ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"];
const LOW_STOCK_THRESHOLD = 5;
const SERIES_DAYS = 30;

const paidLineFilter = (vendorId: string): Prisma.OrderItemWhereInput => ({
  vendorId,
  order: { status: { in: REVENUE_STATUSES } },
});

/** ISO day key (`YYYY-MM-DD`) in UTC. */
function dayKey(date: Date): DayKey {
  return date.toISOString().slice(0, 10);
}

/** Build an empty trailing N-day scaffold so charts have no gaps. */
function emptySeries(days: number): Map<DayKey, SalesPoint> {
  const map = new Map<DayKey, SalesPoint>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dayKey(d);
    map.set(key, { date: key, revenueCents: 0, orders: 0, units: 0 });
  }
  return map;
}

export async function getVendorDashboardStats(vendorId: string): Promise<DashboardStats> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (SERIES_DAYS - 1));
  since.setUTCHours(0, 0, 0, 0);

  const [vendor, lineAgg, activeProducts, lowStockProducts] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: vendorId }, select: { payoutBalanceCents: true } }),
    prisma.orderItem.aggregate({
      where: paidLineFilter(vendorId),
      _sum: { vendorEarningsCents: true, commissionCents: true, quantity: true },
    }),
    prisma.product.count({ where: { vendorId, status: "ACTIVE" } }),
    prisma.product.count({
      where: { vendorId, status: "ACTIVE", inventory: { lte: LOW_STOCK_THRESHOLD } },
    }),
  ]);

  // Gross sales (unit price * qty) can't be summed directly, so pull the paid
  // lines and fold in memory — also reused to build the top-products list.
  const paidLines = await prisma.orderItem.findMany({
    where: paidLineFilter(vendorId),
    select: {
      orderId: true,
      productId: true,
      title: true,
      quantity: true,
      unitPriceCents: true,
      vendorEarningsCents: true,
      product: {
        select: { slug: true, images: { orderBy: { position: "asc" }, take: 1 } },
      },
    },
  });

  const orderIds = new Set<string>();
  let grossSalesCents = 0;
  const byProduct = new Map<string, TopProduct>();
  for (const line of paidLines) {
    orderIds.add(line.orderId);
    grossSalesCents += line.unitPriceCents * line.quantity;
    const existing = byProduct.get(line.productId);
    if (existing) {
      existing.unitsSold += line.quantity;
      existing.revenueCents += line.unitPriceCents * line.quantity;
    } else {
      const img = line.product.images[0];
      byProduct.set(line.productId, {
        productId: line.productId,
        title: line.title,
        slug: line.product.slug,
        image: img ? { url: img.url, alt: img.alt ?? line.title, position: img.position } : null,
        unitsSold: line.quantity,
        revenueCents: line.unitPriceCents * line.quantity,
      });
    }
  }

  const netEarningsCents = lineAgg._sum.vendorEarningsCents ?? 0;
  const commissionCents = lineAgg._sum.commissionCents ?? 0;
  const unitsSold = lineAgg._sum.quantity ?? 0;
  const orderCount = orderIds.size;

  // 30-day series: bucket recent paid lines by their order's creation day.
  const recentLines = await prisma.orderItem.findMany({
    where: { ...paidLineFilter(vendorId), order: { createdAt: { gte: since } } },
    select: {
      quantity: true,
      vendorEarningsCents: true,
      orderId: true,
      order: { select: { createdAt: true } },
    },
  });
  const series = emptySeries(SERIES_DAYS);
  const seenOrderPerDay = new Set<string>();
  for (const line of recentLines) {
    const key = dayKey(line.order.createdAt);
    const bucket = series.get(key);
    if (!bucket) continue;
    bucket.revenueCents += line.vendorEarningsCents;
    bucket.units += line.quantity;
    const dedupe = `${key}:${line.orderId}`;
    if (!seenOrderPerDay.has(dedupe)) {
      seenOrderPerDay.add(dedupe);
      bucket.orders += 1;
    }
  }

  const pendingFulfillment = await prisma.order.count({
    where: {
      status: { in: REVENUE_STATUSES },
      items: { some: { vendorId, fulfillmentStatus: { not: "DELIVERED" } } },
    },
  });

  const topProducts = [...byProduct.values()]
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 5);

  return {
    grossSalesCents,
    netEarningsCents,
    commissionCents,
    orderCount,
    unitsSold,
    avgOrderValueCents: orderCount ? Math.round(grossSalesCents / orderCount) : 0,
    payoutBalanceCents: vendor?.payoutBalanceCents ?? 0,
    pendingFulfillment,
    activeProducts,
    lowStockProducts,
    topProducts,
    salesSeries: [...series.values()],
  };
}

export async function listVendorProducts(vendorId: string): Promise<VendorProductRow[]> {
  const rows = await prisma.product.findMany({
    where: { vendorId },
    orderBy: { updatedAt: "desc" },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      category: true,
      orderItems: {
        where: { order: { status: { in: REVENUE_STATUSES } } },
        select: { quantity: true },
      },
    },
  });

  return rows.map((p) => {
    const img = p.images[0];
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      imageUrl: img ? img.url : null,
      priceCents: p.priceCents,
      compareAtCents: p.compareAtCents,
      currency: p.currency,
      inventory: p.inventory,
      status: p.status,
      aiGenerated: p.aiGenerated,
      sku: p.sku,
      category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
      unitsSold: p.orderItems.reduce((sum, oi) => sum + oi.quantity, 0),
      ratingAvg: Number(p.ratingAvg.toFixed(2)),
      ratingCount: p.ratingCount,
      updatedAt: p.updatedAt,
    };
  });
}

const FULFILLMENT_RANK: Record<FulfillmentStatus, number> = {
  UNFULFILLED: 0,
  PACKED: 1,
  SHIPPED: 2,
  DELIVERED: 3,
};
const RANK_TO_FULFILLMENT = ["UNFULFILLED", "PACKED", "SHIPPED", "DELIVERED"] as const;

export async function listVendorOrders(vendorId: string): Promise<VendorOrderLine[]> {
  // This vendor's line items, newest order first, hydrated with the order info
  // the fulfillment table needs (one row per line so each can be advanced).
  const items = await prisma.orderItem.findMany({
    where: { vendorId },
    orderBy: { order: { createdAt: "desc" } },
    include: {
      order: {
        select: {
          orderNumber: true,
          currency: true,
          createdAt: true,
          customer: { select: { name: true, email: true } },
        },
      },
      product: { select: { images: { orderBy: { position: "asc" }, take: 1 } } },
    },
  });

  return items.map((item) => ({
    id: item.id,
    orderNumber: item.order.orderNumber,
    productTitle: item.title,
    imageUrl: item.product.images[0]?.url ?? null,
    customerName: item.order.customer.name ?? item.order.customer.email,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    vendorEarningsCents: item.vendorEarningsCents,
    currency: item.order.currency,
    fulfillmentStatus: item.fulfillmentStatus,
    createdAt: item.order.createdAt,
  }));
}

/** Full detail for a single order in the vendor console. */
export async function getVendorOrderSummary(
  vendorId: string,
  orderId: string,
): Promise<VendorOrderSummary | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, items: { some: { vendorId } } },
    include: {
      customer: { select: { name: true, email: true } },
      shippingAddress: true,
      items: {
        where: { vendorId },
        include: { product: { select: { images: { orderBy: { position: "asc" }, take: 1 } } } },
      },
    },
  });
  if (!order) return null;

  const address = order.shippingAddress;
  const shippingAddress = address
    ? [address.fullName, address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
        .filter(Boolean)
        .join(", ")
    : null;

  const lines = order.items;
  const minRank = lines.reduce(
    (min, l) => Math.min(min, FULFILLMENT_RANK[l.fulfillmentStatus]),
    FULFILLMENT_RANK.UNFULFILLED,
  );
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    placedAt: order.createdAt,
    customerName: order.customer.name ?? order.customer.email,
    customerEmail: order.customer.email,
    shippingAddress,
    fulfillmentStatus: RANK_TO_FULFILLMENT[minRank] ?? "UNFULFILLED",
    items: lines.map((l) => ({
      id: l.id,
      productTitle: l.title,
      imageUrl: l.product.images[0]?.url ?? null,
      quantity: l.quantity,
      unitPriceCents: l.unitPriceCents,
      vendorEarningsCents: l.vendorEarningsCents,
      fulfillmentStatus: l.fulfillmentStatus,
      refunded: order.status === "REFUNDED" || order.status === "CANCELLED",
    })),
    earningsCents: lines.reduce((sum, l) => sum + l.vendorEarningsCents, 0),
    orderSubtotalCents: order.subtotalCents,
    orderTaxCents: order.taxCents,
    orderShippingCents: order.shippingCents,
    orderTotalCents: order.totalCents,
    currency: order.currency,
  };
}

export async function getVendorPayouts(vendorId: string): Promise<PayoutRow[]> {
  const payouts = await prisma.payout.findMany({
    where: { vendorId },
    orderBy: { createdAt: "desc" },
  });
  return payouts.map((p) => ({
    id: p.id,
    amountCents: p.amountCents,
    currency: p.currency,
    status: p.status,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    createdAt: p.createdAt,
  }));
}
