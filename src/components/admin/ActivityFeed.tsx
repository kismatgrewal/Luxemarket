import {
  CheckCircle2,
  CircleDot,
  PackageCheck,
  ShieldAlert,
  ShoppingBag,
  Store,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  /** Audit-log action key, e.g. "vendor.approved" or "order.paid". */
  action: string;
  actor?: string | null;
  target?: string | null;
  createdAt: string | Date;
}

/** Pick a glyph from the action namespace so the feed scans at a glance. */
function iconFor(action: string): { Icon: LucideIcon; tone: string } {
  const a = action.toLowerCase();
  if (a.includes("approve")) return { Icon: CheckCircle2, tone: "text-emerald bg-emerald/10" };
  if (a.includes("suspend") || a.includes("reject") || a.includes("flag"))
    return { Icon: ShieldAlert, tone: "text-destructive bg-destructive/10" };
  if (a.includes("vendor")) return { Icon: Store, tone: "text-gold-deep bg-gold/12" };
  if (a.includes("user")) return { Icon: UserPlus, tone: "text-ink bg-ink/8" };
  if (a.includes("ship") || a.includes("fulfil"))
    return { Icon: PackageCheck, tone: "text-gold-deep bg-gold/12" };
  if (a.includes("order")) return { Icon: ShoppingBag, tone: "text-ink bg-ink/8" };
  return { Icon: CircleDot, tone: "text-ink-muted bg-ink/8" };
}

/** "vendor.approved" -> "Vendor approved" */
function humanizeAction(action: string) {
  const words = action.replace(/[._]/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (!items?.length) {
    return <p className="py-6 text-center text-sm text-ink-muted">No recent activity.</p>;
  }

  return (
    <ol className="relative space-y-5">
      {items.map((item, i) => {
        const { Icon, tone } = iconFor(item.action);
        const isLast = i === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-3.5">
            {!isLast ? (
              <span className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px bg-ink/8" />
            ) : null}
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm text-ink">
                {humanizeAction(item.action)}
                {item.target ? <span className="text-ink-muted"> · {item.target}</span> : null}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {item.actor ?? "System"} · {timeAgo(item.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
