import type { Metadata } from "next";
import { CalendarClock, CheckCircle2, Percent, Truck, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/misc";
import { PayoutsTable, type PayoutRow } from "@/components/vendor/PayoutsTable";
import { StatTile } from "@/components/vendor/StatTile";
import { formatMoney } from "@/lib/utils";
import { getVendorPayouts } from "@/server/services/vendors";
import { requireActiveVendor } from "../_data";

export const metadata: Metadata = { title: "Payouts" };

function nextFriday() {
  const d = new Date();
  const daysUntil = (5 - d.getDay() + 7) % 7 || 7; // next Friday, never today
  d.setDate(d.getDate() + daysUntil);
  return d;
}

function sumBy(rows: PayoutRow[], status: PayoutRow["status"]) {
  return rows
    .filter((r) => r.status === status)
    .reduce((total, r) => total + r.amountCents, 0);
}

export default async function VendorPayoutsPage() {
  const vendor = await requireActiveVendor();
  const payouts: PayoutRow[] = (await getVendorPayouts(vendor.id)) ?? [];

  const currency = payouts[0]?.currency ?? "USD";
  const inTransitCents = sumBy(payouts, "IN_TRANSIT");
  const paidCents = sumBy(payouts, "PAID");
  const commissionPct = (vendor.commissionBps / 100).toFixed(vendor.commissionBps % 100 ? 1 : 0);

  const breakdown = [
    { label: "Available balance", value: formatMoney(vendor.payoutBalanceCents, currency) },
    { label: "In transit", value: formatMoney(inTransitCents, currency) },
    { label: "Paid out (lifetime)", value: formatMoney(paidCents, currency) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="eyebrow">Earnings</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight text-ink">Payouts</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Track your balance and the payouts sent to your connected account.
        </p>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Available balance"
          value={formatMoney(vendor.payoutBalanceCents, currency)}
          hint="ready for next payout"
          icon={Wallet}
        />
        <StatTile
          label="In transit"
          value={formatMoney(inTransitCents, currency)}
          hint="on the way to your bank"
          icon={Truck}
        />
        <StatTile
          label="Paid out"
          value={formatMoney(paidCents, currency)}
          hint="lifetime"
          icon={CheckCircle2}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* History */}
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader>
            <CardTitle>Payout history</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <PayoutsTable payouts={payouts} />
          </CardContent>
        </Card>

        {/* Schedule + breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Payout schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-md bg-ivory-deep/60 p-3">
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" />
              <div>
                <p className="text-sm font-medium text-ink">Next payout</p>
                <p className="text-sm text-ink-muted">
                  {nextFriday().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Payouts run weekly on Fridays once your balance clears the minimum.
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-muted">
                <Percent className="h-3.5 w-3.5" />
                Marketplace fee · {commissionPct}%
              </p>
              <dl className="space-y-2">
                {breakdown.map((row, i) => (
                  <div key={row.label}>
                    {i > 0 ? <Separator className="mb-2" /> : null}
                    <div className="flex items-center justify-between">
                      <dt className="text-sm text-ink-muted">{row.label}</dt>
                      <dd className="text-sm font-medium tabular-nums text-ink">{row.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
