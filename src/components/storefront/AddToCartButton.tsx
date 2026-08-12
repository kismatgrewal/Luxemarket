"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addItemToCartAction } from "@/app/(storefront)/actions";

/**
 * PDP add-to-bag control: a quantity stepper paired with the primary action.
 * Uses a transition for the server action, surfaces a transient "Added"
 * confirmation, and routes to sign-in when the cart requires authentication.
 */
export function AddToCartButton({
  productId,
  maxQuantity,
  disabled = false,
  className,
}: {
  productId: string;
  maxQuantity?: number;
  disabled?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [qty, setQty] = React.useState(1);
  const [added, setAdded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const cap = typeof maxQuantity === "number" && maxQuantity > 0 ? maxQuantity : 99;
  const soldOut = disabled || cap <= 0;

  function adjust(delta: number) {
    setQty((q) => Math.min(cap, Math.max(1, q + delta)));
  }

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const res = await addItemToCartAction(productId, qty);
      if (res.ok) {
        setAdded(true);
        router.refresh();
        setTimeout(() => setAdded(false), 2200);
      } else if (res.error === "SIGN_IN_REQUIRED") {
        router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      } else {
        setError(res.message ?? "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="inline-flex h-12 items-center rounded-md border border-ink/15 bg-white">
          <button
            type="button"
            onClick={() => adjust(-1)}
            disabled={qty <= 1 || soldOut}
            aria-label="Decrease quantity"
            className="flex h-full w-11 items-center justify-center text-ink transition-colors hover:text-gold-deep disabled:opacity-30"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-sm font-medium tabular-nums text-ink" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => adjust(1)}
            disabled={qty >= cap || soldOut}
            aria-label="Increase quantity"
            className="flex h-full w-11 items-center justify-center text-ink transition-colors hover:text-gold-deep disabled:opacity-30"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <Button
          type="button"
          size="lg"
          onClick={handleAdd}
          disabled={soldOut || isPending}
          className="flex-1"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : added ? (
            <Check className="h-4 w-4" />
          ) : (
            <ShoppingBag className="h-4 w-4" />
          )}
          {soldOut ? "Sold out" : added ? "Added to bag" : "Add to bag"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
