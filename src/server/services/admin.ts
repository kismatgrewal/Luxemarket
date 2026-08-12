import "server-only";

import type { OrderStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { dispatchN8nEvent } from "@/lib/n8n";
import type {
  AdminOrderRow,
  AdminUserRow,
  CategoryMixSlice,
  DayKey,
  MarketplaceStats,
  PendingVendorRow,
} from "@/types";

/**
 * Admin/marketplace read model + moderation actions.
 *
 * Every mutating call records an `AuditLog` row (who did what, to which target)
 * so vendor approvals and suspensions are traceable. `actorId` is the admin
 * performing the action, threaded through from the guarded server action.
 */

const REVENUE_STATUSES: OrderStatus[] = ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"];
const SERIES_DAYS = 30;

function dayKey(date: Date): DayKey {
  return date.toISOString().slice(0, 10);
}

/** Append an audit-trail entry. Best-effort metadata, never PII beyond ids. */
async function audit(
  tx: Prisma.TransactionClient,
  entry: { actorId?: string; action: string; target?: string; metadata?: Prisma.InputJsonValue },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      target: entry.target ?? null,
      metadata: entry.metadata,
    },
  });
}

export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (SERIES_DAYS - 1));
  since.setUTCHours(0, 0, 0, 0);

  const [gmvAgg, commissionAgg, activeVendors, pendingVendors, totalVendors, customerCount, productCount] =
    await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: REVENUE_STATUSES } },
        _sum: { totalCents: true },
        _count: { _all: true },
      }),
      prisma.orderItem.aggregate({
        where: { order: { status: { in: REVENUE_STATUSES } } },
        _sum: { commissionCents: true },
      }),
      prisma.vendor.count({ where: { status: "APPROVED" } }),
      prisma.vendor.count({ where: { status: "PENDING" } }),
      prisma.vendor.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.product.count({ where: { status: "ACTIVE" } }),
    ]);

  const gmvCents = gmvAgg._sum.totalCents ?? 0;
  const orderCount = gmvAgg._count._all;
  const revenueCents = commissionAgg._sum.commissionCents ?? 0;

  // 30-day GMV + commission series.
  const recentOrders = await prisma.order.findMany({
    where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: since } },
    select: {
      createdAt: true,
      totalCents: true,
      items: { select: { commissionCents: true } },
    },
  });
  const seriesMap = new Map<DayKey, { date: DayKey; gmvCents: number; commissionCents: number; orders: number }>();
  const today = new Date();
  for (let i = SERIES_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dayKey(d);
    seriesMap.set(key, { date: key, gmvCents: 0, commissionCents: 0, orders: 0 });
  }
  for (const o of recentOrders) {
    const bucket = seriesMap.get(dayKey(o.createdAt));
    if (!bucket) continue;
    bucket.gmvCents += o.totalCents;
    bucket.commissionCents += o.items.reduce((s, it) => s + it.commissionCents, 0);
    bucket.orders += 1;
  }

  return {
    gmvCents,
    revenueCents,
    orderCount,
    averageOrderValueCents: orderCount ? Math.round(gmvCents / orderCount) : 0,
    activeVendors,
    pendingVendors,
    totalVendors,
    customerCount,
    productCount,
    revenueSeries: [...seriesMap.values()],
    categoryMix: await getCategoryMix(gmvCents),
  };
}

/** GMV split by top-level product category. */
async function getCategoryMix(gmvCents: number): Promise<CategoryMixSlice[]> {
  const [paidLines, productCounts, categories] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { status: { in: REVENUE_STATUSES } } },
      select: {
        quantity: true,
        unitPriceCents: true,
        product: { select: { categoryId: true } },
      },
    }),
    prisma.product.groupBy({
      by: ["categoryId"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.category.findMany({ select: { id: true, name: true, slug: true } }),
  ]);

  const revenueByCategory = new Map<string, number>();
  for (const line of paidLines) {
    const cat = line.product.categoryId;
    if (!cat) continue;
    revenueByCategory.set(cat, (revenueByCategory.get(cat) ?? 0) + line.unitPriceCents * line.quantity);
  }
  const countByCategory = new Map<string, number>();
  for (const c of productCounts) {
    if (c.categoryId) countByCategory.set(c.categoryId, c._count._all);
  }

  return categories
    .map((c) => {
      const revenue = revenueByCategory.get(c.id) ?? 0;
      return {
        categoryId: c.id,
        name: c.name,
        slug: c.slug,
        productCount: countByCategory.get(c.id) ?? 0,
        revenueCents: revenue,
        share: gmvCents > 0 ? Number((revenue / gmvCents).toFixed(4)) : 0,
      };
    })
    .filter((slice) => slice.productCount > 0 || slice.revenueCents > 0)
    .sort((a, b) => b.revenueCents - a.revenueCents);
}

export async function listPendingVendors(): Promise<PendingVendorRow[]> {
  const vendors = await prisma.vendor.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { email: true, name: true } } },
  });
  return vendors.map((v) => ({
    id: v.id,
    storeName: v.storeName,
    slug: v.slug,
    tagline: v.tagline,
    contactEmail: v.user.email,
    contactName: v.user.name,
    appliedAt: v.createdAt,
  }));
}

export async function approveVendor(vendorId: string, actorId?: string): Promise<void> {
  const vendor = await prisma.$transaction(async (tx) => {
    const updated = await tx.vendor.update({
      where: { id: vendorId },
      data: { status: "APPROVED" },
      include: { user: { select: { email: true, name: true } } },
    });
    await audit(tx, {
      actorId,
      action: "vendor.approve",
      target: vendorId,
      metadata: { storeName: updated.storeName },
    });
    return updated;
  });

  // Kick off the onboarding automation (welcome email, Slack ping, etc.).
  void dispatchN8nEvent("vendor.onboarded", {
    vendorId: vendor.id,
    storeName: vendor.storeName,
    slug: vendor.slug,
    contactEmail: vendor.user.email,
    contactName: vendor.user.name,
  });
}

export async function suspendVendor(vendorId: string, actorId?: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const updated = await tx.vendor.update({
      where: { id: vendorId },
      data: { status: "SUSPENDED" },
      select: { storeName: true },
    });
    // Pull the store's products out of the storefront while suspended.
    await tx.product.updateMany({
      where: { vendorId, status: "ACTIVE" },
      data: { status: "ARCHIVED" },
    });
    await audit(tx, {
      actorId,
      action: "vendor.suspend",
      target: vendorId,
      metadata: { storeName: updated.storeName },
    });
  });
}

export async function listUsers(): Promise<AdminUserRow[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      vendor: { select: { status: true } },
      _count: { select: { orders: true } },
    },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    orderCount: u._count.orders,
    vendorStatus: u.vendor?.status ?? null,
    createdAt: u.createdAt,
  }));
}

export async function listAllOrders(): Promise<AdminOrderRow[]> {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      customer: { select: { name: true, email: true } },
      items: { select: { vendorId: true } },
    },
  });
  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    customerName: o.customer.name ?? o.customer.email,
    customerEmail: o.customer.email,
    totalCents: o.totalCents,
    currency: o.currency,
    itemCount: o.items.length,
    vendorCount: new Set(o.items.map((i) => i.vendorId)).size,
    placedAt: o.createdAt,
  }));
}
