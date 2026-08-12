import { cn, formatMoney } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const priceSize: Record<Size, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

const compareSize: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

/**
 * Displays a price and, when the item is discounted, the struck-through
 * compare-at price alongside the amount saved.
 */
export function PriceTag({
  priceCents,
  compareAtCents,
  currency = "USD",
  size = "md",
  className,
}: {
  priceCents: number;
  compareAtCents?: number | null;
  currency?: string;
  size?: Size;
  className?: string;
}) {
  const onSale = typeof compareAtCents === "number" && compareAtCents > priceCents;

  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className={cn("font-medium tracking-tight text-ink", priceSize[size])}>
        {formatMoney(priceCents, currency)}
      </span>
      {onSale && (
        <span className={cn("text-ink-muted line-through", compareSize[size])}>
          {formatMoney(compareAtCents!, currency)}
        </span>
      )}
    </span>
  );
}
