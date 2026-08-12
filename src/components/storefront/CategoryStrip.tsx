import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CategorySummary } from "./types";

/**
 * Horizontal, scroll-snapping strip of top-level categories. Each tile is a
 * tall portrait image with the category name set over an ink scrim. Renders
 * nothing when there are no categories to show.
 */
export function CategoryStrip({
  categories,
  className,
}: {
  categories: CategorySummary[];
  className?: string;
}) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className={cn("container", className)}>
      <div className="flex items-end justify-between gap-6">
        <div>
          <span className="eyebrow">Shop by category</span>
          <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink sm:text-3xl">
            Where to begin
          </h2>
        </div>
        <Link
          href="/search"
          className="hidden shrink-0 text-sm font-medium text-ink underline-offset-4 hover:text-gold-deep hover:underline sm:block"
        >
          View all
        </Link>
      </div>

      <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/search?categorySlug=${category.slug}`}
            className="group relative aspect-[3/4] w-44 shrink-0 snap-start overflow-hidden rounded-lg bg-ivory-deep sm:w-52"
          >
            {category.imageUrl && (
              <Image
                src={category.imageUrl}
                alt={category.name}
                fill
                sizes="208px"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h3 className="font-serif text-lg text-ivory">{category.name}</h3>
              {typeof category.productCount === "number" && (
                <p className="mt-0.5 text-xs text-ivory/70">{category.productCount} pieces</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
