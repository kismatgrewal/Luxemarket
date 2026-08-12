import type { FulfillmentStatus } from "@prisma/client";
import { CheckCircle2, Clock, Package, Truck, type LucideIcon } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";

const CONFIG: Record<
  FulfillmentStatus,
  { label: string; variant: BadgeProps["variant"]; icon: LucideIcon }
> = {
  UNFULFILLED: { label: "Unfulfilled", variant: "warning", icon: Clock },
  PACKED: { label: "Packed", variant: "neutral", icon: Package },
  SHIPPED: { label: "Shipped", variant: "gold", icon: Truck },
  DELIVERED: { label: "Delivered", variant: "success", icon: CheckCircle2 },
};

/** Colour-coded pill for a line item's fulfillment state. */
export function FulfillmentBadge({ status }: { status: FulfillmentStatus }) {
  const { label, variant, icon: Icon } = CONFIG[status];
  return (
    <Badge variant={variant}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
