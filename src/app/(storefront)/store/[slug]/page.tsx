import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, ShieldCheck } from "lucide-react";
import { getVendorStorefront } from "@/server/services/catalog";
import { formatCompact } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { Rating } from "@/components/storefront/Rating";
import { BRAND } from "@/components/storefront/media";
import type { ProductCardData, VendorSummary } from "@/components/storefront/types";

interface Storefront {
  vendor: VendorSummary & { description?: string | null };
  products: ProductCardData[];
}

/** The service may return `{ vendor, products }` or a vendor with nested products. */
function normalize(data: unknown): Storefront | null {
  if (!data) return null;
  const d = data as {
    vendor?: Storefront["vendor"];
    products?: ProductCardData[];
  } & Partial<Storefront["vendor"]> & { products?: ProductCardData[] };

  if (d.vendor) return { vendor: d.vendor, products: d.products ?? [] };
  if (d.slug && d.storeName) {
    return { vendor: d as Storefront["vendor"], products: d.products ?? [] };
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = normalize(await getVendorStorefront(params.slug).catch(() => null));
  if (!data) return { title: "Store not found" };
  return {
    title: data.vendor.storeName,
    description: data.vendor.tagline ?? `Shop ${data.vendor.storeName} on LuxeMarket.`,
  };
}

export default async function StorePage({ params }: { params: { slug: string } }) {
  const data = normalize(await getVendorStorefront(params.slug).catch(() => null));
  if (!data) notFound();

  const { vendor, products } = data;

  return (
    <div>
      {/* Banner */}
      <section className="relative h-56 overflow-hidden bg-ink sm:h-72 md:h-80">
        <Image
          src={vendor.bannerUrl ?? BRAND.storeBanner}
          alt={`${vendor.storeName} banner`}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-ink/10" />
      </section>

      <div className="container">
        {/* Vendor header, pulled up over the banner */}
        <div className="-mt-16 flex flex-col gap-5 sm:-mt-20 sm:flex-row sm:items-end">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-4 border-ivory bg-ivory-deep shadow-lift sm:h-32 sm:w-32">
            {vendor.logoUrl ? (
              <Image src={vendor.logoUrl} alt={vendor.storeName} fill sizes="128px" className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-serif text-4xl text-gold-deep">
                {vendor.storeName.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-3xl tracking-tight text-ink sm:text-4xl">
                {vendor.storeName}
              </h1>
              <Badge variant="gold">
                <ShieldCheck className="h-3 w-3" />
                Verified maker
              </Badge>
            </div>
            {vendor.tagline && <p className="mt-2 max-w-xl text-ink-muted">{vendor.tagline}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
              {typeof vendor.ratingAvg === "number" && (vendor.ratingCount ?? 0) > 0 && (
                <Rating value={vendor.ratingAvg} count={vendor.ratingCount} size="md" />
              )}
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                Independent atelier
              </span>
              <span>
                {formatCompact(products.length)} {products.length === 1 ? "piece" : "pieces"}
              </span>
            </div>
          </div>
        </div>

        {vendor.description && (
          <p className="mt-8 max-w-2xl leading-relaxed text-ink-soft">{vendor.description}</p>
        )}

        {/* Their catalogue */}
        <section className="mt-12 border-t border-ink/8 pt-10">
          <span className="eyebrow">The collection</span>
          <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink">
            Everything from {vendor.storeName}
          </h2>
          <div className="mt-8 pb-4">
            <ProductGrid
              products={products}
              emptyTitle="No pieces listed yet"
              emptyMessage="This maker is still preparing their collection. Check back soon."
            />
          </div>
        </section>
      </div>
    </div>
  );
}
