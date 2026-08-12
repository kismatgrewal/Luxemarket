"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import { updateCartItemAction, removeCartItemAction } from "@/app/(storefront)/actions";
import type { CartLine } from "@/types";

/**
 * A single cart row with an optimistic quantity stepper and remove control.
 * Quantity edits and removal run through server actions inside a transition;
 * the row dims while pending so double-submits read as intentional.
 */
export function CartLineItem({ item }: { item: CartLine }) {
  const router = useRouter();
  const [qty, setQty] = React.useState(item.quantity);
  const [isPending, startTransition] = React.useTransition();

  const img = item.image;
  const cap = item.inventory > 0 ? item.inventory : 99;
  const lineTotal = item.unitPriceCents * qty;

  function commit(next: number) {
    const clamped = Math.min(cap, Math.max(1, next));
    setQty(clamped);
    startTransition(async () => {
      await updateCartItemAction(item.cartItemId, clamped);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await removeCartItemAction(item.cartItemId);
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex gap-4 py-6 transition-opacity sm:gap-6",
        isPending && "pointer-events-none opacity-60",
      )}
    >
      <Link
        href={`/product/${item.slug}`}
        className="relative aspect-[4/5] h-28 w-24 shrink-0 overflow-hidden rounded-md bg-ivory-deep sm:h-32 sm:w-28"
      >
        <Image
          src={img.url}
          alt={img.alt ?? item.title}
          fill
          sizes="112px"
          className="object-cover"
        />
      </Link>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-[0.65rem]">{item.vendorName}</p>
            <h3 className="mt-1 font-serif text-base leading-snug tracking-tight text-ink">
              <Link href={`/product/${item.slug}`} className="hover:text-gold-deep">
                {item.title}
              </Link>
            </h3>
          </div>
          <p className="whitespace-nowrap text-sm font-medium tabular-nums text-ink">
            {formatMoney(lineTotal, item.currency)}
          </p>
        </div>

        <p className="mt-1 text-xs text-ink-muted">
          {formatMoney(item.unitPriceCents, item.currency)} each
        </p>

        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="inline-flex h-9 items-center rounded-md border border-ink/15 bg-white">
            <button
              type="button"
              onClick={() => commit(qty - 1)}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
              className="flex h-full w-9 items-center justify-center text-ink transition-colors hover:text-gold-deep disabled:opacity-30"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-medium tabular-nums text-ink">
              {isPending ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : qty}
            </span>
            <button
              type="button"
              onClick={() => commit(qty + 1)}
              disabled={qty >= cap}
              aria-label="Increase quantity"
              className="flex h-full w-9 items-center justify-center text-ink transition-colors hover:text-gold-deep disabled:opacity-30"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={remove}
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
