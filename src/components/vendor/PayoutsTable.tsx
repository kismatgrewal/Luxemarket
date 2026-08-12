import type { PayoutStatus } from "@prisma/client";
import { Wallet } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/utils";

export type PayoutRow = {
  id: string;
  amountCents: number;
  currency: string;
  status: PayoutStatus;
  periodStart: Date | string;
  periodEnd: Date | string;
  createdAt: Date | string;
};

const STATUS: Record<PayoutStatus, { label: string; variant: BadgeProps["variant"] }> = {
  PENDING: { label: "Pending", variant: "warning" },
  IN_TRANSIT: { label: "In transit", variant: "gold" },
  PAID: { label: "Paid", variant: "success" },
  FAILED: { label: "Failed", variant: "danger" },
};

function fmtRange(start: Date | string, end: Date | string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const s = new Date(start).toLocaleDateString("en-US", opts);
  const e = new Date(end).toLocaleDateString("en-US", {
    ...opts,
    year: "numeric",
  });
  return `${s} – ${e}`;
}

/** History of scheduled payouts to the vendor's connected account. */
export function PayoutsTable({ payouts }: { payouts: PayoutRow[] }) {
  if (payouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ivory-deep text-ink-muted">
          <Wallet className="h-6 w-6" />
        </span>
        <p className="font-serif text-lg text-ink">No payouts yet</p>
        <p className="max-w-sm text-sm text-ink-muted">
          Earnings from delivered orders accrue to your balance and are paid out on a
          rolling schedule once you clear the minimum threshold.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Period</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payouts.map((p) => {
          const status = STATUS[p.status];
          return (
            <TableRow key={p.id}>
              <TableCell className="font-medium">
                {fmtRange(p.periodStart, p.periodEnd)}
              </TableCell>
              <TableCell className="text-ink-muted">
                {new Date(p.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell>
                <Badge variant={status.variant}>{status.label}</Badge>
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatMoney(p.amountCents, p.currency)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
