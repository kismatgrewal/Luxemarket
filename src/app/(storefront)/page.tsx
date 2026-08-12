import Link from "next/link";
import { ArrowRight, PackageCheck, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { getFeaturedProducts, getCategories } from "@/server/services/catalog";
import { HeroSection } from "@/components/storefront/HeroSection";
import { CategoryStrip } from "@/components/storefront/CategoryStrip";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { VendorBand } from "@/components/storefront/VendorBand";
import { Newsletter } from "@/components/storefront/Newsletter";
import type {
  CategorySummary,
  ProductCardData,
  VendorSummary,
} from "@/components/storefront/types";

export const metadata = {
  description:
    "Discover a curated edit of watches, leather goods, and objects for the home from independent luxury makers.",
};

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Authenticated",
    body: "Every maker is vetted and every piece verified before it ships.",
  },
  {
    icon: PackageCheck,
    title: "Considered delivery",
    body: "Complimentary carbon-neutral shipping on orders over $200.",
  },
  {
    icon: Sparkles,
    title: "Concierge sourcing",
    body: "Looking for something specific? Our team will find it for you.",
  },
  {
    icon: RotateCcw,
    title: "30-day returns",
    body: "Change of heart? Return unworn pieces within thirty days.",
  },
];

/** De-duplicate the vendors appearing across the featured products. */
function vendorsFrom(products: ProductCardData[]): VendorSummary[] {
  const seen = new Map<string, VendorSummary>();
  for (const p of products) {
    if (p.vendor && !seen.has(p.vendor.id)) seen.set(p.vendor.id, p.vendor);
  }
  return Array.from(seen.values());
}

export default async function HomePage() {
  const [featured, categories] = await Promise.all([
    getFeaturedProducts(8).catch(() => [] as ProductCardData[]),
    getCategories().catch(() => [] as CategorySummary[]),
  ]);

  const vendors = vendorsFrom(featured);

  return (
    <div className="flex flex-col gap-20 pb-4 md:gap-28">
      <HeroSection />

      <CategoryStrip categories={categories} />

      {/* Featured edit */}
      <section className="container">
        <div className="flex items-end justify-between gap-6">
          <div>
            <span className="eyebrow">The featured edit</span>
            <h2 className="mt-2 font-serif text-3xl tracking-tight text-ink sm:text-4xl">
              Pieces we&apos;re loving now
            </h2>
          </div>
          <Link
            href="/search"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:text-gold-deep hover:underline sm:inline-flex"
          >
            Shop all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10">
          <ProductGrid
            products={featured}
            priorityCount={4}
            emptyTitle="The edit is being curated"
            emptyMessage="Our featured selection is on its way. Check back shortly, or browse the full catalogue."
          />
        </div>
      </section>

      <VendorBand vendors={vendors} />

      {/* Trust / values */}
      <section className="container">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((value) => (
            <div key={value.title} className="flex flex-col">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ivory-deep text-gold-deep">
                <value.icon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <h3 className="mt-4 font-serif text-lg tracking-tight text-ink">{value.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{value.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Newsletter />
    </div>
  );
}
