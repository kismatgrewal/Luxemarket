import {
  Check,
  CircleDot,
  CreditCard,
  MapPin,
  Package,
  ReceiptText,
  Truck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { OrderStatus, ShipmentData, ShipmentStatus } from "./types";

type StepKey = "placed" | "paid" | "prepared" | "shipped" | "out" | "delivered";

const STEPS: { key: StepKey; label: string; caption: string; icon: typeof Check }[] = [
  { key: "placed", label: "Order placed", caption: "We received your order", icon: ReceiptText },
  { key: "paid", label: "Payment confirmed", caption: "Your card was charged", icon: CreditCard },
  { key: "prepared", label: "Prepared", caption: "Makers packed your pieces", icon: Package },
  { key: "shipped", label: "Shipped", caption: "On its way to you", icon: Truck },
  { key: "out", label: "Out for delivery", caption: "Arriving today", icon: MapPin },
  { key: "delivered", label: "Delivered", caption: "Enjoy", icon: Check },
];

const ORDER_RANK: Record<OrderStatus, number> = {
  PENDING: 0,
  PAID: 1,
  FULFILLED: 2,
  SHIPPED: 3,
  DELIVERED: 5,
  CANCELLED: -1,
  REFUNDED: -1,
};

const SHIPMENT_RANK: Record<ShipmentStatus, number> = {
  LABEL_CREATED: 2,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  EXCEPTION: 3,
};

function formatWhen(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Vertical delivery timeline. Progress is the max of the order status and any
 * shipment status, so a shipment that reports OUT_FOR_DELIVERY lights the right
 * step even before the order record catches up. Cancelled/refunded orders show
 * a terminal state instead of the ladder, and shipment scan events (if present)
 * render as a nested history.
 */
export function OrderTimeline({
  status,
  shipment,
  className,
}: {
  status: OrderStatus;
  shipment?: ShipmentData | null;
  className?: string;
}) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border border-ink/8 bg-white p-5 shadow-card",
          className,
        )}
      >
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <p className="font-medium text-ink">
            {status === "CANCELLED" ? "Order cancelled" : "Order refunded"}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {status === "CANCELLED"
              ? "This order was cancelled. Any authorised payment has been released."
              : "This order was refunded. Funds return to your original payment method within 5–10 business days."}
          </p>
        </div>
      </div>
    );
  }

  const rank = Math.max(ORDER_RANK[status] ?? 0, shipment ? SHIPMENT_RANK[shipment.status] ?? 0 : 0);
  const events = shipment?.events ?? [];

  return (
    <div className={cn("rounded-lg border border-ink/8 bg-white p-6 shadow-card", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg tracking-tight text-ink">Delivery status</h3>
        {shipment && (
          <Badge variant={shipment.status === "EXCEPTION" ? "warning" : "gold"}>
            {shipment.status.replace(/_/g, " ").toLowerCase()}
          </Badge>
        )}
      </div>

      <ol className="mt-6">
        {STEPS.map((step, i) => {
          const stepRank = i; // step index doubles as its rank (0..5)
          const done = rank >= stepRank;
          const current = rank === stepRank;
          const isLast = i === STEPS.length - 1;
          const Icon = step.icon;

          return (
            <li key={step.key} className="relative flex gap-4 pb-7 last:pb-0">
              {!isLast && (
                <span
                  className={cn(
                    "absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px",
                    done ? "bg-gold/50" : "bg-ink/10",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
                  done
                    ? "border-gold-deep bg-gold-deep text-ivory"
                    : "border-ink/15 bg-white text-ink-muted",
                )}
              >
                {done ? <Icon className="h-4 w-4" /> : <CircleDot className="h-3.5 w-3.5" />}
              </span>
              <div className="pt-1">
                <p className={cn("text-sm font-medium", done ? "text-ink" : "text-ink-muted")}>
                  {step.label}
                </p>
                <p className="text-xs text-ink-muted">{step.caption}</p>
                {current && shipment?.estimatedDelivery && step.key !== "delivered" && (
                  <p className="mt-1 text-xs text-gold-deep">
                    Est. delivery {formatWhen(shipment.estimatedDelivery)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {shipment && (
        <div className="mt-2 border-t border-ink/8 pt-4 text-xs text-ink-muted">
          <span className="font-medium text-ink">{shipment.carrier}</span> · Tracking{" "}
          <span className="tabular-nums">{shipment.trackingNumber}</span>
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-ink/8 pt-4">
          <p className="eyebrow">Tracking history</p>
          <ul className="space-y-2.5">
            {events
              .slice()
              .reverse()
              .map((event, idx) => (
                <li key={idx} className="flex items-start justify-between gap-4 text-xs">
                  <div>
                    <p className="font-medium capitalize text-ink">
                      {event.status.replace(/_/g, " ").toLowerCase()}
                    </p>
                    {event.location && <p className="text-ink-muted">{event.location}</p>}
                  </div>
                  <time className="shrink-0 whitespace-nowrap tabular-nums text-ink-muted">
                    {formatWhen(event.timestamp)}
                  </time>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
