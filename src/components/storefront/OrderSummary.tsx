import * as React from "react";
import { cn, formatMoney } from "@/lib/utils";
import { Separator } from "@/components/ui/misc";
import type { CartTotals } from "./types";

function Row({
  label,
  value,
  muted,
  emphasis,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn(muted ? "text-ink-muted" : "text-ink", emphasis && "font-medium")}>
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          muted ? "text-ink-muted" : "text-ink",
          emphasis && "font-medium",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Order/price recap shown alongside the cart and checkout. Free shipping is
 * communicated explicitly (a zero shipping line reads as "Complimentary").
 * Children render below the totals — typically the primary CTA.
 */
export function OrderSummary({
  totals,
  itemCount,
  currency = "USD",
  heading = "Order summary",
  note,
  children,
  className,
}: {
  totals: CartTotals;
  itemCount?: number;
  currency?: string;
  heading?: string;
  note?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const cur = totals.currency ?? currency;

  return (
    <div className={cn("rounded-lg border border-ink/8 bg-white p-6 shadow-card", className)}>
      <h2 className="font-serif text-lg tracking-tight text-ink">{heading}</h2>
      {typeof itemCount === "number" && (
        <p className="mt-1 text-xs text-ink-muted">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
      )}

      <div className="mt-5 space-y-3">
        <Row label="Subtotal" value={formatMoney(totals.subtotalCents, cur)} />
        {typeof totals.discountCents === "number" && totals.discountCents > 0 && (
          <Row label="Discount" value={`−${formatMoney(totals.discountCents, cur)}`} muted />
        )}
        <Row
          label="Shipping"
          value={
            totals.shippingCents > 0 ? (
              formatMoney(totals.shippingCents, cur)
            ) : (
              <span className="text-emerald">Complimentary</span>
            )
          }
          muted
        />
        <Row label="Estimated tax" value={formatMoney(totals.taxCents, cur)} muted />
      </div>

      <Separator className="my-5" />

      <Row label="Total" value={formatMoney(totals.totalCents, cur)} emphasis />

      {children && <div className="mt-6">{children}</div>}
      {note && <div className="mt-4 text-xs leading-relaxed text-ink-muted">{note}</div>}
    </div>
  );
}
