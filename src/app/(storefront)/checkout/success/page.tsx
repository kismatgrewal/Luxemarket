import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { getOrderByNumber } from "@/server/services/orders";
import { Button } from "@/components/ui/button";
import { OrderTimeline } from "@/components/storefront/OrderTimeline";
import type { OrderDetailData, OrderStatus } from "@/components/storefront/types";

export const metadata = { title: "Order confirmed" };

interface SuccessParams {
  order?: string;
  payment_intent?: string;
  redirect_status?: string;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: SuccessParams;
}) {
  // If we were handed an order number, enrich the page with real details.
  const order = searchParams.order
    ? ((await getOrderByNumber(searchParams.order).catch(() => null)) as OrderDetailData | null)
    : null;

  const orderNumber =
    order?.orderNumber ??
    searchParams.order ??
    (searchParams.payment_intent
      ? `#${searchParams.payment_intent.slice(-8).toUpperCase()}`
      : "Confirmed");
  const status: OrderStatus = order?.status ?? "PAID";

  return (
    <div className="container flex flex-col items-center py-16 md:py-24">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald/10 text-emerald">
        <CheckCircle2 className="h-8 w-8" strokeWidth={1.5} />
      </span>

      <span className="eyebrow mt-8 text-emerald">Order confirmed</span>
      <h1 className="mt-3 text-center font-serif text-3xl tracking-tight text-ink sm:text-4xl">
        Thank you for your order
      </h1>
      <p className="mt-4 max-w-md text-center text-ink-muted">
        We&apos;ve received your order and payment. A confirmation with tracking details is on its
        way to your inbox.
      </p>

      <div className="mt-8 rounded-full border border-ink/12 bg-white px-6 py-2.5 text-sm">
        <span className="text-ink-muted">Order</span>{" "}
        <span className="font-medium tabular-nums text-ink">{orderNumber}</span>
      </div>

      <div className="mt-12 w-full max-w-xl">
        <OrderTimeline status={status} shipment={order?.shipments?.[0]} />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {order ? (
          <Button asChild size="lg">
            <Link href={`/orders/${order.orderNumber}`}>View order</Link>
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link href="/orders">View your orders</Link>
          </Button>
        )}
        <Button asChild variant="outline" size="lg">
          <Link href="/search">Continue shopping</Link>
        </Button>
      </div>

      <p className="mt-8 flex items-center gap-1.5 text-xs text-ink-muted">
        <Mail className="h-3.5 w-3.5" />
        Need help? Reach our concierge at care@luxemarket.com
      </p>
    </div>
  );
}
