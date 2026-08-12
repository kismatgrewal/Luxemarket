import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin } from "lucide-react";
import { getOrderByNumber } from "@/server/services/orders";
import { formatMoney } from "@/lib/utils";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { OrderTimeline } from "@/components/storefront/OrderTimeline";
import { OrderSummary } from "@/components/storefront/OrderSummary";
import { primaryImage } from "@/components/storefront/media";
import type { OrderDetailData, OrderStatus } from "@/components/storefront/types";

const STATUS_META: Record<OrderStatus, { label: string; variant: BadgeProps["variant"] }> = {
  PENDING: { label: "Awaiting payment", variant: "warning" },
  PAID: { label: "Confirmed", variant: "gold" },
  FULFILLED: { label: "Preparing", variant: "gold" },
  SHIPPED: { label: "Shipped", variant: "gold" },
  DELIVERED: { label: "Delivered", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
  REFUNDED: { label: "Refunded", variant: "danger" },
};

export async function generateMetadata({
  params,
}: {
  params: { number: string };
}): Promise<Metadata> {
  return { title: `Order ${params.number}` };
}

function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function OrderDetailPage({ params }: { params: { number: string } }) {
  const order = (await getOrderByNumber(params.number).catch(() => null)) as OrderDetailData | null;
  if (!order) notFound();

  const meta = STATUS_META[order.status] ?? { label: order.status, variant: "neutral" as const };
  const address = order.shippingAddress;
  const shipment = order.shipments?.[0];

  return (
    <div className="container py-8 md:py-12">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        All orders
      </Link>

      <header className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-ink/8 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl tracking-tight text-ink sm:text-4xl">
              Order {order.orderNumber}
            </h1>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          <p className="mt-2 text-sm text-ink-muted">Placed {formatDate(order.createdAt)}</p>
        </div>
      </header>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-16">
        {/* Items + address */}
        <div>
          <section>
            <h2 className="font-serif text-xl tracking-tight text-ink">Items</h2>
            <ul className="mt-5 divide-y divide-ink/8 border-y border-ink/8">
              {order.items.map((item) => {
                const img = primaryImage(item.product?.images);
                const href = item.product?.slug ? `/product/${item.product.slug}` : undefined;
                const thumb = (
                  <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-ivory-deep">
                    <Image src={img.url} alt={item.title} fill sizes="64px" className="object-cover" />
                  </span>
                );
                return (
                  <li key={item.id} className="flex items-center gap-4 py-4">
                    {href ? <Link href={href}>{thumb}</Link> : thumb}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">
                        {href ? (
                          <Link href={href} className="hover:text-gold-deep">
                            {item.title}
                          </Link>
                        ) : (
                          item.title
                        )}
                      </p>
                      {item.vendor && (
                        <p className="mt-0.5 text-xs text-ink-muted">{item.vendor.storeName}</p>
                      )}
                      <p className="mt-1 text-sm text-ink-muted">Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium tabular-nums text-ink">
                      {formatMoney(item.unitPriceCents * item.quantity, order.currency)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          {address && (
            <section className="mt-10">
              <h2 className="flex items-center gap-2 font-serif text-xl tracking-tight text-ink">
                <MapPin className="h-4 w-4 text-gold-deep" />
                Shipping to
              </h2>
              <address className="mt-4 rounded-lg border border-ink/8 bg-white p-5 text-sm not-italic leading-relaxed text-ink-soft shadow-card">
                <p className="font-medium text-ink">{address.fullName}</p>
                <p>{address.line1}</p>
                {address.line2 && <p>{address.line2}</p>}
                <p>
                  {address.city}, {address.state} {address.postalCode}
                </p>
                <p>{address.country}</p>
                {address.phone && <p className="mt-2 text-ink-muted">{address.phone}</p>}
              </address>
            </section>
          )}
        </div>

        {/* Tracking + totals */}
        <aside className="space-y-6">
          <OrderTimeline status={order.status} shipment={shipment} />
          <OrderSummary
            heading="Payment summary"
            totals={{
              subtotalCents: order.subtotalCents,
              taxCents: order.taxCents,
              shippingCents: order.shippingCents,
              totalCents: order.totalCents,
              currency: order.currency,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
