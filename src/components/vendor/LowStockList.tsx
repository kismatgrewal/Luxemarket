import Image from "next/image";
import Link from "next/link";
import { ImageOff, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type LowStockItem = {
  id: string;
  title: string;
  sku: string;
  inventory: number;
  imageUrl?: string | null;
};

/** Attention list of products at or near sell-out, shown on the overview. */
export function LowStockList({
  items,
  threshold = 5,
}: {
  items: LowStockItem[];
  threshold?: number;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald/10 text-emerald">
          <PackageCheck className="h-5 w-5" />
        </span>
        <p className="text-sm font-medium text-ink">Stock levels look healthy</p>
        <p className="text-xs text-ink-muted">
          Nothing is under {threshold} units right now.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-ink/8">
      {items.map((item) => {
        const out = item.inventory <= 0;
        return (
          <li key={item.id} className="flex items-center gap-3 py-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-ivory-deep">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-ink-muted">
                  <ImageOff className="h-4 w-4" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href="/vendor/products"
                className="block truncate text-sm font-medium text-ink hover:text-gold-deep"
              >
                {item.title}
              </Link>
              <p className="truncate text-xs text-ink-muted">{item.sku}</p>
            </div>
            <Badge variant={out ? "danger" : "warning"}>
              {out ? "Out of stock" : `${item.inventory} left`}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
