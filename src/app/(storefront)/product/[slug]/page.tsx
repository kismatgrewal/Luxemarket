import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ShieldCheck, Store, Truck } from "lucide-react";
import { getProductBySlug } from "@/server/services/catalog";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { PriceTag } from "@/components/storefront/PriceTag";
import { Rating } from "@/components/storefront/Rating";
import { AddToCartButton } from "@/components/storefront/AddToCartButton";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { galleryImages, primaryImage } from "@/components/storefront/media";
import type { ProductDetail } from "@/components/storefront/types";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = (await getProductBySlug(params.slug).catch(() => null)) as ProductDetail | null;
  if (!product) return { title: "Product not found" };

  const img = primaryImage(product.images);
  return {
    title: product.title,
    description: product.description?.slice(0, 160),
    openGraph: {
      title: `${product.title} · ${product.vendor.storeName}`,
      description: product.description?.slice(0, 200),
      images: img.url ? [img.url] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = (await getProductBySlug(params.slug).catch(() => null)) as ProductDetail | null;
  if (!product) notFound();

  const images = galleryImages(product.images);
  const reviews = product.reviews ?? [];
  const related = product.relatedFromVendor ?? [];
  const inStock = typeof product.inventory === "number" ? product.inventory > 0 : true;
  const lowStock = typeof product.inventory === "number" && product.inventory > 0 && product.inventory <= 5;

  const specs: { label: string; value: string }[] = [
    { label: "Maker", value: product.vendor.storeName },
    ...(product.category ? [{ label: "Category", value: product.category.name }] : []),
    ...(product.sku ? [{ label: "SKU", value: product.sku }] : []),
    { label: "Availability", value: inStock ? "In stock" : "Sold out" },
  ];

  return (
    <div className="container py-8 md:py-12">
      {/* Breadcrumb */}
      <nav className="eyebrow flex items-center gap-2 text-[0.65rem]">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <span aria-hidden>/</span>
        <Link href="/search" className="hover:text-ink">
          Shop
        </Link>
        {product.category && (
          <>
            <span aria-hidden>/</span>
            <Link href={`/search?categorySlug=${product.category.slug}`} className="hover:text-ink">
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={images} title={product.title} />

        {/* Purchase panel */}
        <div className="lg:pt-4">
          <Link
            href={`/store/${product.vendor.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-deep underline-offset-4 hover:underline"
          >
            <Store className="h-4 w-4" />
            {product.vendor.storeName}
          </Link>

          <h1 className="mt-3 font-serif text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
            {product.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <PriceTag
              priceCents={product.priceCents}
              compareAtCents={product.compareAtCents}
              currency={product.currency}
              size="lg"
            />
            {typeof product.ratingAvg === "number" && (product.ratingCount ?? 0) > 0 && (
              <Rating value={product.ratingAvg} count={product.ratingCount} size="md" />
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {lowStock && <Badge variant="warning">Only {product.inventory} left</Badge>}
            {!inStock && <Badge variant="outline">Sold out</Badge>}
            {product.aiGenerated && <Badge variant="neutral">AI-assisted description</Badge>}
          </div>

          <p className="mt-6 max-w-prose leading-relaxed text-ink-soft">
            {product.description?.split("\n\n")[0]}
          </p>

          <div className="mt-8">
            <AddToCartButton productId={product.id} maxQuantity={product.inventory} disabled={!inStock} />
          </div>

          {/* Reassurance */}
          <ul className="mt-8 space-y-3 border-t border-ink/8 pt-6 text-sm text-ink-muted">
            <li className="flex items-center gap-3">
              <Truck className="h-4 w-4 shrink-0 text-gold-deep" />
              Complimentary carbon-neutral shipping over $200
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-gold-deep" />
              Authenticity verified by LuxeMarket
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-4 w-4 shrink-0 text-gold-deep" />
              30-day returns on unworn pieces
            </li>
          </ul>
        </div>
      </div>

      {/* Details + specs */}
      <div className="mt-20 grid gap-12 border-t border-ink/8 pt-12 lg:grid-cols-[1.6fr_1fr] lg:gap-20">
        <section>
          <span className="eyebrow">Details</span>
          <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink">About this piece</h2>
          <div className="mt-5 max-w-prose space-y-4 leading-relaxed text-ink-soft">
            {(product.description ?? "").split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>

        <section>
          <span className="eyebrow">Specifications</span>
          <dl className="mt-5 divide-y divide-ink/8 border-y border-ink/8">
            {specs.map((spec) => (
              <div key={spec.label} className="flex items-center justify-between py-3 text-sm">
                <dt className="text-ink-muted">{spec.label}</dt>
                <dd className="font-medium text-ink">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {/* Reviews */}
      <section className="mt-20 border-t border-ink/8 pt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Reviews</span>
            <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink">
              What buyers are saying
            </h2>
          </div>
          {typeof product.ratingAvg === "number" && (product.ratingCount ?? 0) > 0 && (
            <div className="text-right">
              <div className="font-serif text-3xl text-ink">{product.ratingAvg.toFixed(1)}</div>
              <Rating value={product.ratingAvg} count={product.ratingCount} showCount={false} />
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-ink/12 bg-white/50 px-6 py-12 text-center text-sm text-ink-muted">
            No reviews yet. Be the first to share your impressions of this piece.
          </p>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-lg border border-ink/8 bg-white p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <Rating value={review.rating} showCount={false} />
                  <time className="text-xs text-ink-muted">{timeAgo(review.createdAt)}</time>
                </div>
                {review.title && (
                  <h3 className="mt-3 font-serif text-lg tracking-tight text-ink">{review.title}</h3>
                )}
                {review.body && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{review.body}</p>}
                <p className="mt-4 text-xs font-medium text-ink-muted">
                  {review.customer?.name ?? "Verified buyer"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* More from vendor */}
      {related.length > 0 && (
        <section className="mt-20 border-t border-ink/8 pt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="eyebrow">The maker</span>
              <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink">
                More from {product.vendor.storeName}
              </h2>
            </div>
            <Link
              href={`/store/${product.vendor.slug}`}
              className="hidden text-sm font-medium text-ink underline-offset-4 hover:text-gold-deep hover:underline sm:block"
            >
              Visit store
            </Link>
          </div>
          <div className="mt-10">
            <ProductGrid products={related.slice(0, 4)} />
          </div>
        </section>
      )}
    </div>
  );
}
