import Link from "next/link";
import { ArrowRight, CheckCircle2, DollarSign, Percent, ShoppingBag, Store } from "lucide-react";
import { getMarketplaceStats, listPendingVendors } from "@/server/services/admin";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiTile } from "@/components/admin/KpiTile";
import { RevenueChart, type RevenuePoint } from "@/components/admin/RevenueChart";
import { CategoryDonut, type CategorySlice } from "@/components/admin/CategoryDonut";
import { ActivityFeed, type ActivityItem } from "@/components/admin/ActivityFeed";
import { formatMoney } from "@/lib/utils";

// The console reflects live marketplace state on every visit.
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [stats, pending, recent] = await Promise.all([
    getMarketplaceStats(),
    listPendingVendors(),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { name: true, email: true } } },
    }),
  ]);

  // Map the marketplace read model onto the shapes the tiles and charts expect.
  // Orders "today" is the most recent bucket of the daily revenue series.
  const ordersToday = stats.revenueSeries.at(-1)?.orders ?? 0;

  const series: RevenuePoint[] = stats.revenueSeries.map((point) => ({
    label: new Date(`${point.date}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    gmvCents: point.gmvCents,
    commissionCents: point.commissionCents,
  }));

  const categoryMix: CategorySlice[] = stats.categoryMix.map((c) => ({
    name: c.name,
    value: c.productCount,
  }));

  const activity: ActivityItem[] = recent.map((log) => ({
    id: log.id,
    action: log.action,
    actor: log.actor?.name ?? log.actor?.email ?? null,
    target: log.target,
    createdAt: log.createdAt,
  }));

  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      <header>
        <p className="eyebrow">Overview</p>
        <h1 className="display mt-1 text-3xl">Marketplace at a glance</h1>
        <p className="mt-1 text-ink-muted">
          Trading performance, commission revenue, and the health of the vendor network.
        </p>
      </header>

      {/* KPI row */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Gross merchandise value"
          value={formatMoney(stats.gmvCents)}
          sublabel={`${stats.orderCount.toLocaleString()} paid orders all-time`}
          icon={DollarSign}
        />
        <KpiTile
          label="Marketplace revenue"
          value={formatMoney(stats.revenueCents)}
          sublabel="Commission earned"
          icon={Percent}
        />
        <KpiTile
          label="Active vendors"
          value={stats.activeVendors.toLocaleString()}
          sublabel={`${stats.pendingVendors} awaiting review`}
          icon={Store}
        />
        <KpiTile
          label="Orders today"
          value={ordersToday.toLocaleString()}
          sublabel="Paid so far today"
          icon={ShoppingBag}
        />
      </div>

      {/* Revenue + category mix */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue</CardTitle>
              <p className="text-sm text-ink-muted">GMV and commission over the last 30 days</p>
            </div>
            <div className="hidden items-center gap-4 text-xs text-ink-muted sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-gold" /> GMV
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-ink" /> Revenue
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={series} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category mix</CardTitle>
            <p className="text-sm text-ink-muted">Live products by category</p>
          </CardHeader>
          <CardContent>
            <CategoryDonut data={categoryMix} />
          </CardContent>
        </Card>
      </div>

      {/* Activity + pending approvals */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <p className="text-sm text-ink-muted">The latest events from the audit trail</p>
          </CardHeader>
          <CardContent>
            <ActivityFeed items={activity} />
          </CardContent>
        </Card>

        <PendingApprovalsCallout
          count={pending.length}
          names={pending.slice(0, 3).map((v) => v.storeName)}
        />
      </div>
    </div>
  );
}

function PendingApprovalsCallout({ count, names }: { count: number; names: string[] }) {
  if (count === 0) {
    return (
      <Card className="flex flex-col items-center justify-center bg-emerald/[0.04] p-8 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald/10 text-emerald">
          <CheckCircle2 className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <p className="mt-4 font-serif text-lg text-ink">Queue is clear</p>
        <p className="mt-1 text-sm text-ink-muted">No vendor applications are awaiting review.</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col bg-gold/[0.06] p-6">
      <p className="eyebrow text-gold-deep">Action required</p>
      <p className="mt-3 font-serif text-4xl tracking-tight text-ink">{count}</p>
      <p className="text-sm text-ink-muted">
        {count === 1 ? "vendor application" : "vendor applications"} awaiting review
      </p>

      <ul className="mt-4 space-y-1.5">
        {names.map((name) => (
          <li key={name} className="flex items-center gap-2 text-sm text-ink">
            <Store className="h-3.5 w-3.5 text-gold-deep" />
            <span className="truncate">{name}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-5">
        <Button asChild variant="gold" size="sm" className="w-full">
          <Link href="/admin/vendors">
            Review queue
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
