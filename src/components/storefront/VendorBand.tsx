import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Rating } from "./Rating";
import { BRAND } from "./media";
import type { VendorSummary } from "./types";

/**
 * "Meet the makers" editorial band. A tall lifestyle image anchors a short
 * manifesto beside a stacked list of featured vendors. Falls back to nothing
 * only if there is neither copy nor vendors to show.
 */
export function VendorBand({
  vendors,
  className,
}: {
  vendors: VendorSummary[];
  className?: string;
}) {
  const featured = (vendors ?? []).slice(0, 4);

  return (
    <section className={cn("bg-ink text-ivory", className)}>
      <div className="container grid gap-12 py-20 md:py-28 lg:grid-cols-2 lg:items-center lg:gap-20">
        <div className="relative order-last aspect-[4/5] overflow-hidden rounded-lg bg-ink-soft lg:order-first">
          <Image
            src={BRAND.makers}
            alt="A maker at work in the studio"
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover opacity-90"
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-ivory/10" />
        </div>

        <div>
          <span className="eyebrow text-gold-soft">Meet the makers</span>
          <h2 className="mt-4 font-serif text-3xl font-light leading-tight tracking-tight text-ivory sm:text-4xl">
            Every piece has a person behind it
          </h2>
          <p className="mt-5 max-w-md text-ivory/70">
            We partner with a small roster of independent studios and ateliers — vetted for
            craftsmanship, materials, and a point of view. Get to know the houses shaping our
            collection.
          </p>

          {featured.length > 0 && (
            <ul className="mt-10 divide-y divide-ivory/10 border-y border-ivory/10">
              {featured.map((vendor) => (
                <li key={vendor.id}>
                  <Link
                    href={`/store/${vendor.slug}`}
                    className="group flex items-center gap-4 py-4 transition-colors"
                  >
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-ivory/10 ring-1 ring-ivory/15">
                      {vendor.logoUrl ? (
                        <Image
                          src={vendor.logoUrl}
                          alt={vendor.storeName}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center font-serif text-sm text-gold-soft">
                          {vendor.storeName.charAt(0)}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-serif text-lg text-ivory transition-colors group-hover:text-gold-soft">
                        {vendor.storeName}
                      </span>
                      {vendor.tagline ? (
                        <span className="block truncate text-sm text-ivory/60">{vendor.tagline}</span>
                      ) : (
                        typeof vendor.ratingAvg === "number" &&
                        (vendor.ratingCount ?? 0) > 0 && (
                          <span className="mt-0.5 block">
                            <Rating value={vendor.ratingAvg} count={vendor.ratingCount} />
                          </span>
                        )
                      )}
                    </span>
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-ivory/40 transition-colors group-hover:text-gold-soft" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/vendors"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-gold-soft underline-offset-4 hover:underline"
          >
            Explore all makers
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
