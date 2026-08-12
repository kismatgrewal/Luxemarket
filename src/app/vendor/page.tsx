import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Boxes, DollarSign, ImageOff, ShoppingCart, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FulfillmentBadge } from "@/components/vendor/FulfillmentBadge";
import { LowStockList, type LowStockItem } from "@/components/vendor/LowStockList";
import { SalesChart } from "@/components/vendor/SalesChart";
import { StatTile } from "@/components/vendor/StatTile";
import { formatMoney, timeAgo } from "@/lib/utils";
import {
  getVendorDashboardStats,
  listVendorOrders,
  listVendorProducts,
} from "@/server/services/vendors";
import { requireActiveVendor } from "./_data";

export const metadata: Metadata = { title: "Overview" };

const LOW_STOCK_THRESHOLD = 5;

export default async function VendorOverviewPage() {
  const vendor = await requireActiveVendor();

  const [stats, orders, products] = await Promise.all([
    getVendorDashboardStats(vendor.id),
    listVendorOrders(vendor.id),
    listVendorProducts(vendor.id),
  ]);

  const currency = "USD";
  const recent = orders.slice(0, 6);

  const lowStock: LowStockItem[] = products
    .filter((p) => p.inventory <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.inventory - b.inventory)
    .slice(0, 6)
    .map((p) => ({
      id: p.id,
      title: p.title,
      sku: p.sku ?? "—",
      inventory: p.inventory,
      imageUrl: p.imageUrl,
    }));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="eyebrow">Overview</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight text-ink">
          Welcome back, {vendor.storeName}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Here&apos;s how your store performed over the last 30 days.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Gross sales"
          value={formatMoney(stats.grossSalesCents, currency)}
          hint="paid orders, 30 days"
          icon={DollarSign}
        />
        <StatTile
          label="Net earnings"
          value={formatMoney(stats.netEarningsCents, currency)}
          hint="after marketplace commission"
          icon={Wallet}
        />
        <StatTile
          label="Orders"
          value={String(stats.orderCount)}
          hint="vs. prior 30 days"
          icon={ShoppingCart}
        />
        <StatTile
          label="Units sold"
          value={String(stats.unitsSold)}
          hint="lifetime"
          icon={Boxes}
        />
      </div>

      {/* Sales chart */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Sales</CardTitle>
            <p className="text-sm text-ink-muted">Daily revenue, last 30 days</p>
          </div>
        </CardHeader>
        <CardContent>
          <SalesChart data={stats.salesSeries} currency={currency} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent orders</CardTitle>
            <Link href="/vendor/orders" className="text-sm font-medium text-gold-deep hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {recent.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-ink-muted">No orders yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Product</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6 text-right">Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-ivory-deep">
                            {line.imageUrl ? (
                              <Image
                                src={line.imageUrl}
                                alt={line.productTitle}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-ink-muted">
                                <ImageOff className="h-4 w-4" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{line.productTitle}</p>
                            <p className="text-xs text-ink-muted">{timeAgo(line.createdAt)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-ink-muted">{line.orderNumber}</TableCell>
                      <TableCell>
                        <FulfillmentBadge status={line.fulfillmentStatus} />
                      </TableCell>
                      <TableCell className="pr-6 text-right font-medium tabular-nums">
                        {formatMoney(line.vendorEarningsCents, line.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Low stock */}
        <Card>
          <CardHeader>
            <CardTitle>Low stock</CardTitle>
            <p className="text-sm text-ink-muted">At or under {LOW_STOCK_THRESHOLD} units</p>
          </CardHeader>
          <CardContent>
            <LowStockList items={lowStock} threshold={LOW_STOCK_THRESHOLD} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
