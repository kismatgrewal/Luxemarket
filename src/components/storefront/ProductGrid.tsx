import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductCard } from "./ProductCard";
import type { ProductCardData } from "./types";

/**
 * Responsive product grid with a graceful empty state. `priorityCount` marks
 * the first N images as LCP-priority (used on the home/landing grids).
 */
export function ProductGrid({
  products,
  columns = 4,
  priorityCount = 0,
  emptyTitle = "Nothing here yet",
  emptyMessage = "We couldn't find any pieces matching your selection. Try adjusting your filters.",
  className,
}: {
  products: ProductCardData[];
  columns?: 3 | 4;
  priorityCount?: number;
  emptyTitle?: string;
  emptyMessage?: string;
  className?: string;
}) {
  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink/12 bg-white/50 px-6 py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ivory-deep text-ink-muted">
          <PackageOpen className="h-6 w-6" strokeWidth={1.5} />
        </span>
        <h3 className="mt-5 font-serif text-xl text-ink">{emptyTitle}</h3>
        <p className="mt-2 max-w-sm text-sm text-ink-muted">{emptyMessage}</p>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href="/search">Browse the full catalogue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-x-8",
        columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        "md:grid-cols-3",
        className,
      )}
    >
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} priority={i < priorityCount} />
      ))}
    </div>
  );
}
