import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PriceTag } from "./PriceTag";
import { Rating } from "./Rating";
import { primaryImage } from "./media";
import type { ProductCardData } from "./types";

/**
 * Editorial product tile: quiet by default, lifting its image and revealing a
 * gold rule on hover. Links through to the PDP; the vendor name links to the
 * store without nesting anchors.
 */
export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductCardData;
  priority?: boolean;
  className?: string;
}) {
  const img = product.image ?? primaryImage(product.images);
  const onSale =
    typeof product.compareAtCents === "number" && product.compareAtCents > product.priceCents;
  const soldOut =
    typeof product.inStock === "boolean"
      ? !product.inStock
      : typeof product.inventory === "number" && product.inventory <= 0;
  const discountPct = onSale
    ? Math.round(((product.compareAtCents! - product.priceCents) / product.compareAtCents!) * 100)
    : 0;

  return (
    <article className={cn("group relative flex flex-col", className)}>
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden rounded-lg bg-ivory-deep"
      >
        <Image
          src={img.url}
          alt={img.alt ?? product.title}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 50vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {onSale && <Badge variant="gold">−{discountPct}%</Badge>}
          {soldOut && <Badge variant="outline">Sold out</Badge>}
        </div>
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        <Link
          href={`/store/${product.vendor.slug}`}
          className="eyebrow text-[0.65rem] transition-colors hover:text-gold-deep"
        >
          {product.vendor.storeName}
        </Link>
        <h3 className="mt-1.5 font-serif text-[1.05rem] leading-snug tracking-tight text-ink">
          <Link href={`/product/${product.slug}`} className="after:absolute after:inset-0">
            {product.title}
          </Link>
        </h3>

        {typeof product.ratingAvg === "number" && (product.ratingCount ?? 0) > 0 && (
          <div className="mt-1.5">
            <Rating value={product.ratingAvg} count={product.ratingCount} />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <PriceTag
            priceCents={product.priceCents}
            compareAtCents={product.compareAtCents}
            currency={product.currency}
          />
        </div>
      </div>
    </article>
  );
}
