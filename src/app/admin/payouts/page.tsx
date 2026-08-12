import type { Metadata } from "next";
import type { PayoutStatus } from "@prisma/client";
import { Wallet } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayoutCycleForm } from "@/components/admin/PayoutCycleForm";
import { StatTile } from "@/components/vendor/StatTile";
import { formatMoney } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Payouts" };
export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<PayoutStatus, { label: string; variant: BadgeProps["variant"] }> = {
  PENDING: { label: "Pending", variant: "warning" },
  IN_TRANSIT: { label: "In transit", variant: "gold" },
  PAID: { label: "Paid", variant: "success" },
  FAILED: { label: "Failed", variant: "danger" },
};

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminPayoutsPage() {
  const [balanceAgg, statusAgg, recent] = await Promise.all([
    prisma.vendor.aggregate({
      where: { status: "APPROVED" },
      _sum: { payoutBalanceCents: true },
    }),
    prisma.payout.groupBy({
      by: ["status"],
      _count: { status: true },
      _sum: { amountCents: true },
    }),
    prisma.payout.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { vendor: { select: { storeName: true } } },
    }),
  ]);

  const pendingBalance = balanceAgg._sum.payoutBalanceCents ?? 0;
  const byStatus = new Map(statusAgg.map((s) => [s.status, s]));
  const inTransitCents = byStatus.get("IN_TRANSIT")?._sum.amountCents ?? 0;
  const paidCents = byStatus.get("PAID")?._sum.amountCents ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="eyebrow">Settlement</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight text-ink">Payouts</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Sweep vendor balances into payout records for a settlement window.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Accrued balances"
          value={formatMoney(pendingBalance, "USD")}
          hint="across approved vendors"
          icon={Wallet}
        />
        <StatTile
          label="In transit"
          value={formatMoney(inTransitCents, "USD")}
          hint="payouts being processed"
        />
        <StatTile
          label="Paid out (lifetime)"
          value={formatMoney(paidCents, "USD")}
          hint="all completed transfers"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Run a payout cycle</CardTitle>
            <p className="text-sm text-ink-muted">
              Creates a PENDING payout for every vendor with a positive balance.
            </p>
          </CardHeader>
          <CardContent>
            <PayoutCycleForm />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Recent payout records</CardTitle>
            <p className="text-sm text-ink-muted">The last 20 settlements</p>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {recent.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-ink-muted">No payout records yet.</p>
            ) : (
              <ul className="divide-y divide-ink/8">
                {recent.map((payout) => (
                  <li key={payout.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{payout.vendor.storeName}</p>
                      <p className="text-xs text-ink-muted">
                        {formatDate(payout.periodStart)} – {formatDate(payout.periodEnd)}
                      </p>
                    </div>
                    <Badge variant={STATUS_BADGE[payout.status].variant}>
                      {STATUS_BADGE[payout.status].label}
                    </Badge>
                    <p className="w-24 text-right font-medium tabular-nums text-ink">
                      {formatMoney(payout.amountCents, payout.currency)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
