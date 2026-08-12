import { Star } from "lucide-react";
import { cn, formatCompact } from "@/lib/utils";

type Size = "sm" | "md";

const starPx: Record<Size, string> = { sm: "h-3.5 w-3.5", md: "h-4 w-4" };

/**
 * Five-star rating with fractional fill. Renders two star rows — a muted base
 * and a gold overlay clipped to the score's width — so half-stars read cleanly.
 */
export function Rating({
  value = 0,
  count,
  size = "sm",
  showCount = true,
  className,
}: {
  value?: number;
  count?: number;
  size?: Size;
  showCount?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const pct = (clamped / 5) * 100;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative inline-flex" aria-hidden="true">
        <span className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={cn(starPx[size], "text-ink/15")} strokeWidth={1.5} />
          ))}
        </span>
        <span
          className="absolute inset-y-0 left-0 flex overflow-hidden"
          style={{ width: `${pct}%` }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(starPx[size], "shrink-0 fill-gold text-gold")}
              strokeWidth={1.5}
            />
          ))}
        </span>
      </span>
      {showCount && (
        <span className="text-xs text-ink-muted">
          {clamped.toFixed(1)}
          {typeof count === "number" && count > 0 && (
            <span className="ml-1 text-ink-muted/70">({formatCompact(count)})</span>
          )}
        </span>
      )}
      <span className="sr-only">
        Rated {clamped.toFixed(1)} out of 5{typeof count === "number" ? ` from ${count} reviews` : ""}
      </span>
    </span>
  );
}
