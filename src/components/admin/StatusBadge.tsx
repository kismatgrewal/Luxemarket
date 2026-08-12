import { Badge, type BadgeProps } from "@/components/ui/badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * Single source of truth for how a lifecycle status reads across the console.
 * Every enum the admin ever sees — vendor, order, fulfillment, product,
 * payout, payment — resolves through one map so the same status always wears
 * the same colour, whichever table it lands in.
 */
const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  // VendorStatus
  PENDING: "warning",
  APPROVED: "success",
  SUSPENDED: "danger",
  REJECTED: "danger",
  // OrderStatus
  PAID: "gold",
  FULFILLED: "gold",
  SHIPPED: "neutral",
  DELIVERED: "success",
  CANCELLED: "danger",
  REFUNDED: "outline",
  // FulfillmentStatus
  UNFULFILLED: "outline",
  PACKED: "neutral",
  // ProductStatus
  DRAFT: "outline",
  ACTIVE: "success",
  ARCHIVED: "neutral",
  // PayoutStatus / PaymentStatus
  IN_TRANSIT: "gold",
  FAILED: "danger",
  REQUIRES_PAYMENT: "warning",
  PROCESSING: "gold",
  SUCCEEDED: "success",
};

/** "OUT_FOR_DELIVERY" -> "Out for delivery" */
function humanize(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, " ");
}

export function StatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  if (!status) return <span className="text-ink-muted">—</span>;
  const variant = STATUS_VARIANTS[status] ?? "neutral";
  return (
    <Badge variant={variant} className={className}>
      {humanize(status)}
    </Badge>
  );
}
