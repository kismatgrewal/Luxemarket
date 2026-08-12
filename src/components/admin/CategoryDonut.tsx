"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipProps } from "recharts";
import { formatCompact } from "@/lib/utils";

export interface CategorySlice {
  name: string;
  /** Weight of the slice — product count or GMV, whichever the caller passes. */
  value: number;
}

// Champagne-led palette drawn from the design tokens, warm to cool.
const PALETTE = [
  "#B8945F",
  "#8C6B3E",
  "#0F6B4F",
  "#1A1A1D",
  "#D9C4A1",
  "#6B6B70",
  "#A07A46",
  "#C9B896",
];

function SliceTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const slice = payload[0];
  if (!slice) return null;
  return (
    <div className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm shadow-lift">
      <span className="flex items-center gap-2 text-ink">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: slice.payload.fill }}
        />
        {slice.name}
        <span className="font-medium tabular-nums">{formatCompact(Number(slice.value))}</span>
      </span>
    </div>
  );
}

export function CategoryDonut({ data }: { data: CategorySlice[] }) {
  const total = data?.reduce((sum, d) => sum + d.value, 0) ?? 0;

  if (!data?.length || total === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-ink-muted">
        No catalogued products yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<SliceTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-2xl tracking-tight text-ink">
            {formatCompact(total)}
          </span>
          <span className="eyebrow">Products</span>
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {data.map((entry, i) => {
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <li key={entry.name} className="flex items-center gap-2.5 text-sm">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-ink">{entry.name}</span>
              <span className="tabular-nums text-ink-muted">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
