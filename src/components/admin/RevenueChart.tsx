"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { formatCompact, formatMoney } from "@/lib/utils";

export interface RevenuePoint {
  /** Short axis label for the week, e.g. "Apr 8". */
  label: string;
  gmvCents: number;
  commissionCents: number;
}

const GOLD = "#B8945F";
const INK = "#0B0B0C";

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-ink/10 bg-white px-3 py-2 shadow-lift">
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center justify-between gap-6 text-sm text-ink">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-medium tabular-nums">{formatMoney(Number(entry.value))}</span>
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  if (!data?.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-ink-muted">
        No revenue recorded yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barGap={2}>
        <CartesianGrid vertical={false} stroke="rgba(11,11,12,0.06)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          tick={{ fontSize: 11, fill: "#6B6B70" }}
          dy={6}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tick={{ fontSize: 11, fill: "#6B6B70" }}
          tickFormatter={(v: number) => `$${formatCompact(v / 100)}`}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(184,148,95,0.08)" }} />
        <Bar dataKey="gmvCents" name="GMV" fill={GOLD} radius={[3, 3, 0, 0]} maxBarSize={20} />
        <Bar
          dataKey="commissionCents"
          name="Revenue"
          fill={INK}
          radius={[3, 3, 0, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
