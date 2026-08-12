"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import type { FulfillmentStatus } from "@prisma/client";
import { ImageOff, Loader2, Package, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatMoney, timeAgo } from "@/lib/utils";
import { FulfillmentBadge } from "./FulfillmentBadge";

export type VendorOrderLine = {
  /** OrderItem id — the unit fulfillment advances against. */
  id: string;
  orderNumber: string;
  productTitle: string;
  imageUrl?: string | null;
  customerName?: string | null;
  quantity: number;
  unitPriceCents: number;
  vendorEarningsCents: number;
  currency: string;
  fulfillmentStatus: FulfillmentStatus;
  createdAt: Date | string;
};

/** The next step a vendor can trigger, and how the button reads. */
const NEXT_STEP: Partial<
  Record<FulfillmentStatus, { to: FulfillmentStatus; label: string; icon: typeof Package }>
> = {
  UNFULFILLED: { to: "PACKED", label: "Mark packed", icon: Package },
  PACKED: { to: "SHIPPED", label: "Mark shipped", icon: Truck },
};

export function OrdersTable({
  orders,
  onAdvance,
}: {
  orders: VendorOrderLine[];
  onAdvance: (orderItemId: string, status: FulfillmentStatus) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  function advance(id: string, to: FulfillmentStatus) {
    setActiveId(id);
    startTransition(async () => {
      try {
        await onAdvance(id, to);
      } finally {
        setActiveId(null);
      }
    });
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ivory-deep text-ink-muted">
          <ShoppingBag className="h-6 w-6" />
        </span>
        <p className="font-serif text-lg text-ink">No orders here yet</p>
        <p className="max-w-sm text-sm text-ink-muted">
          When customers buy your products, their line items land here ready to pack and
          ship.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Order</TableHead>
          <TableHead>Placed</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Earnings</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((line) => {
          const step = NEXT_STEP[line.fulfillmentStatus];
          const busy = pending && activeId === line.id;
          return (
            <TableRow key={line.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-ivory-deep">
                    {line.imageUrl ? (
                      <Image
                        src={line.imageUrl}
                        alt={line.productTitle}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-ink-muted">
                        <ImageOff className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{line.productTitle}</p>
                    <p className="text-xs text-ink-muted">
                      Qty {line.quantity} · {formatMoney(line.unitPriceCents, line.currency)} ea
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="font-medium text-ink">{line.orderNumber}</span>
                {line.customerName ? (
                  <p className="text-xs text-ink-muted">{line.customerName}</p>
                ) : null}
              </TableCell>
              <TableCell className="whitespace-nowrap text-ink-muted">
                {timeAgo(line.createdAt)}
              </TableCell>
              <TableCell>
                <FulfillmentBadge status={line.fulfillmentStatus} />
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatMoney(line.vendorEarningsCents, line.currency)}
              </TableCell>
              <TableCell className="text-right">
                {step ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => advance(line.id, step.to)}
                    className={cn(busy && "opacity-70")}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <step.icon className="h-4 w-4" />
                    )}
                    {step.label}
                  </Button>
                ) : (
                  <span className="text-xs text-ink-muted">
                    {line.fulfillmentStatus === "SHIPPED" ? "In transit" : "Complete"}
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
