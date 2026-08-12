import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTileProps = {
  label: string;
  value: string;
  /** Period-over-period change as a fraction (0.124 → +12.4%). */
  delta?: number;
  /** Small caption under the value (e.g. "vs. last 30 days"). */
  hint?: string;
  icon?: LucideIcon;
};

/** Single KPI tile used across the vendor overview. */
export function StatTile({ label, value, delta, hint, icon: Icon }: StatTileProps) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const positive = (delta ?? 0) >= 0;

  return (
    <div className="rounded-lg border border-ink/8 bg-white p-6 shadow-card">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        {Icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold-deep">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        ) : null}
      </div>

      <p className="mt-4 font-serif text-3xl tracking-tight text-ink">{value}</p>

      {(hasDelta || hint) && (
        <div className="mt-2 flex items-center gap-2">
          {hasDelta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                positive ? "bg-emerald/10 text-emerald" : "bg-destructive/10 text-destructive",
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(delta! * 100).toFixed(1)}%
            </span>
          ) : null}
          {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
        </div>
      )}
    </div>
  );
}
