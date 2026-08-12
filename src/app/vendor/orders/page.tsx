import Link from "next/link";
import type { Metadata } from "next";
import type { FulfillmentStatus } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { OrdersTable, type VendorOrderLine } from "@/components/vendor/OrdersTable";
import { cn } from "@/lib/utils";
import { listVendorOrders } from "@/server/services/vendors";
import { requireActiveVendor } from "../_data";
import { advanceFulfillmentAction } from "./actions";

export const metadata: Metadata = { title: "Orders" };

const FILTERS: { key: string; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "UNFULFILLED", label: "Unfulfilled" },
  { key: "PACKED", label: "Packed" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
];

function buildHref(status: string) {
  return status === "ALL" ? "/vendor/orders" : `/vendor/orders?status=${status}`;
}

export default async function VendorOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const vendor = await requireActiveVendor();
  const lines: VendorOrderLine[] = (await listVendorOrders(vendor.id)) ?? [];

  const activeStatus = (searchParams.status ?? "ALL").toUpperCase() as FulfillmentStatus | "ALL";
  const rows =
    activeStatus === "ALL"
      ? lines
      : lines.filter((l) => l.fulfillmentStatus === activeStatus);

  const needsAction = lines.filter(
    (l) => l.fulfillmentStatus === "UNFULFILLED" || l.fulfillmentStatus === "PACKED",
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="eyebrow">Fulfillment</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight text-ink">Orders</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {needsAction > 0
            ? `${needsAction} line ${needsAction === 1 ? "item needs" : "items need"} packing or shipping`
            : "You're all caught up on fulfillment"}
        </p>
      </div>

      <div className="inline-flex items-center gap-1 overflow-x-auto rounded-md bg-ivory-deep p-1">
        {FILTERS.map((f) => {
          const active = activeStatus === f.key;
          return (
            <Link
              key={f.key}
              href={buildHref(f.key)}
              className={cn(
                "shrink-0 rounded px-3.5 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <OrdersTable orders={rows} onAdvance={advanceFulfillmentAction} />
      </Card>
    </div>
  );
}
