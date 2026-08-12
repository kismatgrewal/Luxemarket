import Link from "next/link";
import { ArrowRight, Lock, ShoppingBag } from "lucide-react";
import { getCart } from "@/server/services/cart";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CartLineItem } from "@/components/storefront/CartLineItem";
import { OrderSummary } from "@/components/storefront/OrderSummary";
import type { CartSummary } from "@/types";

export const metadata = { title: "Your bag" };

function EmptyState({ signedOut }: { signedOut?: boolean }) {
  return (
    <div className="container flex flex-col items-center py-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ivory-deep text-ink-muted">
        <ShoppingBag className="h-7 w-7" strokeWidth={1.5} />
      </span>
      <h1 className="mt-6 font-serif text-3xl tracking-tight text-ink">
        {signedOut ? "Sign in to view your bag" : "Your bag is empty"}
      </h1>
      <p className="mt-3 max-w-sm text-ink-muted">
        {signedOut
          ? "Sign in to see the pieces you've saved and continue to checkout."
          : "Once you add pieces to your bag they'll appear here, ready for checkout."}
      </p>
      <div className="mt-8 flex gap-3">
        {signedOut ? (
          <Button asChild size="lg">
            <Link href="/login?callbackUrl=/cart">Sign in</Link>
          </Button>
        ) : null}
        <Button asChild variant={signedOut ? "outline" : "primary"} size="lg">
          <Link href="/search">Explore the edit</Link>
        </Button>
      </div>
    </div>
  );
}

export default async function CartPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return <EmptyState signedOut />;

  const cart: CartSummary = (await getCart(user.id).catch(() => null)) ?? {
    id: null,
    items: [],
    totals: {
      itemCount: 0,
      subtotalCents: 0,
      taxCents: 0,
      shippingCents: 0,
      totalCents: 0,
      currency: "USD",
    },
  };
  if (!cart.items || cart.items.length === 0) return <EmptyState />;

  const itemCount = cart.totals.itemCount;

  return (
    <div className="container py-10 md:py-14">
      <header className="border-b border-ink/8 pb-6">
        <h1 className="font-serif text-3xl tracking-tight text-ink sm:text-4xl">Your bag</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
      </header>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-16">
        <div className="divide-y divide-ink/8">
          {cart.items.map((item) => (
            <CartLineItem key={item.cartItemId} item={item} />
          ))}
        </div>

        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <OrderSummary
            totals={cart.totals}
            itemCount={itemCount}
            note={
              <span className="flex items-center gap-1.5">
                <Lock className="h-3 w-3" />
                Taxes and shipping calculated at checkout.
              </span>
            }
          >
            <Button asChild size="lg" className="w-full">
              <Link href="/checkout">
                Proceed to checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="mt-2 w-full">
              <Link href="/search">Continue shopping</Link>
            </Button>
          </OrderSummary>
        </aside>
      </div>
    </div>
  );
}
