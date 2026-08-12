import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { listCustomerOrders } from "@/server/services/orders";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { primaryImage } from "@/components/storefront/media";
import type { OrderStatus, OrderSummaryLine } from "@/components/storefront/types";

export const metadata = { title: "Your orders" };

const STATUS_META: Record<OrderStatus, { label: string; variant: BadgeProps["variant"] }> = {
  PENDING: { label: "Awaiting payment", variant: "warning" },
  PAID: { label: "Confirmed", variant: "gold" },
  FULFILLED: { label: "Preparing", variant: "gold" },
  SHIPPED: { label: "Shipped", variant: "gold" },
  DELIVERED: { label: "Delivered", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
  REFUNDED: { label: "Refunded", variant: "danger" },
};

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status] ?? { label: status, variant: "neutral" as const };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function OrdersPage() {
  const user = await getCurrentUser().catch(() => null);

  if (!user) {
    return (
      <div className="container flex flex-col items-center py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ivory-deep text-ink-muted">
          <Package className="h-7 w-7" strokeWidth={1.5} />
        </span>
        <h1 className="mt-6 font-serif text-3xl tracking-tight text-ink">Sign in to view orders</h1>
        <p className="mt-3 max-w-sm text-ink-muted">
          Track deliveries and revisit past purchases once you&apos;re signed in.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/login?callbackUrl=/orders">Sign in</Link>
        </Button>
      </div>
    );
  }

  const orders = ((await listCustomerOrders(user.id).catch(() => [])) as OrderSummaryLine[]) ?? [];

  if (orders.length === 0) {
    return (
      <div className="container flex flex-col items-center py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ivory-deep text-ink-muted">
          <Package className="h-7 w-7" strokeWidth={1.5} />
        </span>
        <h1 className="mt-6 font-serif text-3xl tracking-tight text-ink">No orders yet</h1>
        <p className="mt-3 max-w-sm text-ink-muted">
          When you place your first order it will appear here, with live delivery tracking.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/search">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-14">
      <header className="border-b border-ink/8 pb-6">
        <h1 className="font-serif text-3xl tracking-tight text-ink sm:text-4xl">Your orders</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </p>
      </header>

      <ul className="mt-8 space-y-5">
        {orders.map((order) => {
          const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
          return (
            <li key={order.id}>
              <Link
                href={`/orders/${order.orderNumber}`}
                className="group flex flex-col gap-5 rounded-lg border border-ink/8 bg-white p-5 shadow-card transition-shadow hover:shadow-lift sm:flex-row sm:items-center sm:justify-between sm:p-6"
              >
                <div className="flex items-center gap-5">
                  <div className="flex -space-x-3">
                    {order.items.slice(0, 3).map((item) => {
                      const img = primaryImage(item.product?.images);
                      return (
                        <span
                          key={item.id}
                          className="relative h-14 w-12 overflow-hidden rounded-md border-2 border-white bg-ivory-deep"
                        >
                          <Image
                            src={img.url}
                            alt={item.title}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </span>
                      );
                    })}
                    {order.items.length > 3 && (
                      <span className="flex h-14 w-12 items-center justify-center rounded-md border-2 border-white bg-ivory-deep text-xs font-medium text-ink-muted">
                        +{order.items.length - 3}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium tabular-nums text-ink">{order.orderNumber}</p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {formatDate(order.createdAt)} · {itemCount} {itemCount === 1 ? "item" : "items"}
                    </p>
                    <div className="mt-2">
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-6 sm:justify-end">
                  <p className="font-medium tabular-nums text-ink">
                    {formatMoney(order.totalCents, order.currency)}
                  </p>
                  <ArrowRight className="h-5 w-5 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
