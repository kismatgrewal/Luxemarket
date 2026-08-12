import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCart } from "@/server/services/cart";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";
import { CheckoutForm } from "@/components/storefront/CheckoutForm";
import { OrderSummary } from "@/components/storefront/OrderSummary";
import type { CartSummary } from "@/types";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?callbackUrl=/checkout");

  const cart: CartSummary | null = await getCart(user.id).catch(() => null);
  if (!cart || cart.items.length === 0) redirect("/cart");

  const totals = cart.totals;
  const currency = totals.currency;

  return (
    <div className="container py-8 md:py-12">
      <Link
        href="/cart"
        className="inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to bag
      </Link>

      <div className="mt-6 grid gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
        {/* Address + payment */}
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-ink sm:text-4xl">Checkout</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Complete your details to place your order securely.
          </p>
          <div className="mt-10">
            <CheckoutForm />
          </div>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="rounded-lg border border-ink/8 bg-white p-6 shadow-card">
            <h2 className="font-serif text-lg tracking-tight text-ink">Your order</h2>
            <ul className="mt-5 space-y-4">
              {cart.items.map((item) => (
                <li key={item.cartItemId} className="flex items-center gap-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md bg-ivory-deep">
                    <Image
                      src={item.image.url}
                      alt={item.image.alt ?? item.title}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[0.6rem] font-semibold text-ivory">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                    <p className="truncate text-xs text-ink-muted">{item.vendorName}</p>
                  </div>
                  <p className="text-sm tabular-nums text-ink">
                    {formatMoney(item.unitPriceCents * item.quantity, currency)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <OrderSummary totals={totals} currency={currency} className="mt-5" heading="Total due" />
        </aside>
      </div>
    </div>
  );
}
