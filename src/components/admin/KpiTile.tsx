import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KpiTileProps {
  label: string;
  value: string;
  sublabel?: string;
  /** Signed period-over-period change, rendered as a coloured trend chip. */
  delta?: number;
  icon?: LucideIcon;
  className?: string;
}

export function KpiTile({ label, value, sublabel, delta, icon: Icon, className }: KpiTileProps) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const positive = (delta ?? 0) >= 0;

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <p className="eyebrow">{label}</p>
        {Icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/12 text-gold-deep">
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
        ) : null}
      </div>

      <p className="mt-5 font-serif text-3xl leading-none tracking-tight text-ink">{value}</p>

      <div className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
        {hasDelta ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              positive ? "text-emerald" : "text-destructive",
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(delta ?? 0).toFixed(1)}%
          </span>
        ) : null}
        {sublabel ? <span className="truncate">{sublabel}</span> : null}
      </div>
    </Card>
  );
}
