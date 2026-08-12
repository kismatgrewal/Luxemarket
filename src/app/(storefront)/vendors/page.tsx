import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Store } from "lucide-react";
import { listApprovedVendors } from "@/server/services/catalog";
import { formatMoney } from "@/lib/utils";
import { Rating } from "@/components/storefront/Rating";

export const metadata: Metadata = {
  title: "Our makers",
  description: "Meet the independent makers behind the LuxeMarket edit.",
};

export default async function VendorsDirectoryPage() {
  const vendors = await listApprovedVendors().catch(() => []);

  return (
    <div className="container py-10 md:py-14">
      <header className="max-w-2xl border-b border-ink/8 pb-8">
        <nav className="eyebrow mb-4 flex items-center gap-2 text-[0.65rem]">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ink">Makers</span>
        </nav>
        <h1 className="font-serif text-3xl tracking-tight text-ink sm:text-4xl">Our makers</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Every piece on LuxeMarket comes from an independent maker we&apos;ve invited into the
          marketplace. Explore their stores, read their stories, and shop their edits.
        </p>
      </header>

      {vendors.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ivory-deep text-ink-muted">
            <Store className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <h2 className="mt-6 font-serif text-2xl text-ink">Makers are joining soon</h2>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">
            New stores are onboarded regularly. Check back soon.
          </p>
        </div>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => (
            <li key={vendor.id}>
              <Link
                href={`/store/${vendor.slug}`}
                className="group flex h-full flex-col rounded-lg border border-ink/8 bg-white p-6 shadow-card transition-shadow hover:shadow-lift"
              >
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-ivory-deep">
                    {vendor.logoUrl ? (
                      <Image
                        src={vendor.logoUrl}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-serif text-lg text-gold-deep">
                        {vendor.storeName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-serif text-lg tracking-tight text-ink group-hover:text-gold-deep">
                      {vendor.storeName}
                    </h2>
                    {vendor.tagline ? (
                      <p className="truncate text-sm text-ink-muted">{vendor.tagline}</p>
                    ) : null}
                  </div>
                </div>

                {vendor.description ? (
                  <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-muted">
                    {vendor.description}
                  </p>
                ) : (
                  <div className="flex-1" />
                )}

                <div className="mt-5 flex items-center justify-between border-t border-ink/8 pt-4">
                  <div className="flex items-center gap-3">
                    {vendor.ratingCount > 0 ? (
                      <Rating value={vendor.ratingAvg} count={vendor.ratingCount} />
                    ) : (
                      <span className="text-xs text-ink-muted">New arrival</span>
                    )}
                    <span className="text-xs text-ink-muted">
                      {vendor.productCount} {vendor.productCount === 1 ? "piece" : "pieces"}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-muted transition-transform group-hover:translate-x-0.5" />
                </div>

                {vendor.products.length > 0 ? (
                  <div className="mt-4 flex gap-2">
                    {vendor.products.slice(0, 4).map((product) => (
                      <span
                        key={product.id}
                        className="relative h-14 w-12 overflow-hidden rounded-md bg-ivory-deep"
                      >
                        <Image
                          src={product.image.url}
                          alt={product.image.alt ?? product.title}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </span>
                    ))}
                  </div>
                ) : null}

                {vendor.products[0] ? (
                  <p className="mt-4 text-sm font-medium text-ink">
                    From {formatMoney(vendor.products[0].priceCents, vendor.products[0].currency)}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
