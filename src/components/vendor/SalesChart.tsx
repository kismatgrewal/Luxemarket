"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact, formatMoney } from "@/lib/utils";

export type SalesPoint = {
  /** ISO date (YYYY-MM-DD) for the day. */
  date: string;
  revenueCents: number;
  orders: number;
};

// Chart palette mirrors the design tokens; Recharts renders raw SVG so the
// values are inlined rather than pulled from Tailwind classes.
const GOLD = "#B8945F";
const INK_MUTED = "#6B6B70";
const GRID = "rgba(11,11,12,0.06)";

function formatDay(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: SalesPoint }>;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-md border border-ink/10 bg-white px-3 py-2 shadow-lift">
      <p className="text-xs font-medium text-ink-muted">{formatDay(point.date)}</p>
      <p className="mt-0.5 font-serif text-base text-ink">
        {formatMoney(point.revenueCents, currency)}
      </p>
      <p className="text-xs text-ink-muted">
        {point.orders} {point.orders === 1 ? "order" : "orders"}
      </p>
    </div>
  );
}

/** 30-day revenue trend for the vendor overview. */
export function SalesChart({
  data,
  currency = "USD",
}: {
  data: SalesPoint[];
  currency?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-md border border-dashed border-ink/12 text-sm text-ink-muted">
        No sales in this period yet.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity={0.28} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
          />
          <YAxis
            width={48}
            tickFormatter={(v: number) => formatCompact(v / 100)}
            tickLine={false}
            axisLine={false}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
          />
          <Tooltip
            cursor={{ stroke: GOLD, strokeWidth: 1, strokeDasharray: "4 4" }}
            content={<ChartTooltip currency={currency} />}
          />
          <Area
            type="monotone"
            dataKey="revenueCents"
            stroke={GOLD}
            strokeWidth={2}
            fill="url(#salesFill)"
            activeDot={{ r: 4, fill: GOLD, stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
