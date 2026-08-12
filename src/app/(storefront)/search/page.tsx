import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { listProducts, getCategories } from "@/server/services/catalog";
import type { ListProductsParams, Paginated, ProductCard } from "@/types";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { FilterSidebar, SORT_OPTIONS } from "@/components/storefront/FilterSidebar";
import type { CategorySummary, ProductCardData } from "@/components/storefront/types";

export const metadata = {
  title: "Shop the catalogue",
  description: "Browse and filter the full LuxeMarket catalogue of premium goods.",
};

const PAGE_SIZE = 24;

interface SearchParams {
  q?: string;
  categorySlug?: string;
  sort?: string;
  min?: string;
  max?: string;
  page?: string;
}

/** Normalise whatever the service returns into a consistent listing shape. */
function normalize(result: unknown) {
  if (Array.isArray(result)) {
    return { products: result as ProductCardData[], total: result.length, totalPages: 1 };
  }
  const r = (result ?? {}) as Partial<Paginated<ProductCard>> & {
    products?: ProductCardData[];
    count?: number;
  };
  const products = (r.items ?? r.products ?? []) as ProductCardData[];
  const total = r.total ?? r.count ?? products.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return { products, total, totalPages };
}

/** Build a `/search` href, merging overrides over the current params. */
function buildHref(current: SearchParams, overrides: Partial<SearchParams>) {
  const params = new URLSearchParams();
  const merged = { ...current, ...overrides };
  (Object.keys(merged) as (keyof SearchParams)[]).forEach((key) => {
    const value = merged[key];
    if (value) params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const min = searchParams.min ? Number(searchParams.min) : undefined;
  const max = searchParams.max ? Number(searchParams.max) : undefined;
  const sort = SORT_OPTIONS.some((o) => o.value === searchParams.sort)
    ? (searchParams.sort as ListProductsParams["sort"])
    : undefined;

  const [result, categories] = await Promise.all([
    listProducts({
      q: searchParams.q,
      categorySlug: searchParams.categorySlug,
      sort,
      // UI enters whole currency units; the service works in cents.
      min: typeof min === "number" && !Number.isNaN(min) ? min * 100 : undefined,
      max: typeof max === "number" && !Number.isNaN(max) ? max * 100 : undefined,
      page,
      pageSize: PAGE_SIZE,
    }).catch(() => [] as ProductCardData[]),
    getCategories().catch(() => [] as CategorySummary[]),
  ]);

  const { products, total, totalPages } = normalize(result);

  const activeCategory = categories.find((c) => c.slug === searchParams.categorySlug);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === searchParams.sort)?.label;
  const heading = searchParams.q
    ? `Results for “${searchParams.q}”`
    : activeCategory
      ? activeCategory.name
      : "All pieces";

  return (
    <div className="container py-10 md:py-14">
      <header className="border-b border-ink/8 pb-8">
        <nav className="eyebrow mb-4 flex items-center gap-2 text-[0.65rem]">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ink">{activeCategory ? activeCategory.name : "Shop"}</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl tracking-tight text-ink sm:text-4xl">{heading}</h1>
            <p className="mt-2 text-sm text-ink-muted">
              {total} {total === 1 ? "piece" : "pieces"}
              {sortLabel ? ` · sorted by ${sortLabel.toLowerCase()}` : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[260px_1fr] lg:gap-14">
        {/* Desktop filters */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <FilterSidebar categories={categories} current={searchParams} />
          </div>
        </aside>

        {/* Mobile filters */}
        <details className="group rounded-lg border border-ink/10 bg-white p-4 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters &amp; sort
            </span>
            <span className="text-ink-muted transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="mt-5">
            <FilterSidebar categories={categories} current={searchParams} />
          </div>
        </details>

        <div>
          <ProductGrid
            products={products}
            emptyTitle="No pieces match those filters"
            emptyMessage="Try widening your price range or clearing a filter to see more of the collection."
          />

          {totalPages > 1 && (
            <nav
              className="mt-14 flex items-center justify-center gap-1"
              aria-label="Pagination"
            >
              <PageLink
                href={buildHref(searchParams, { page: String(page - 1) })}
                disabled={page <= 1}
              >
                Previous
              </PageLink>
              {Array.from({ length: totalPages }).map((_, i) => {
                const n = i + 1;
                return (
                  <Link
                    key={n}
                    href={buildHref(searchParams, { page: String(n) })}
                    aria-current={n === page ? "page" : undefined}
                    className={
                      n === page
                        ? "flex h-10 w-10 items-center justify-center rounded-md bg-ink text-sm font-medium text-ivory"
                        : "flex h-10 w-10 items-center justify-center rounded-md text-sm text-ink transition-colors hover:bg-ink/5"
                    }
                  >
                    {n}
                  </Link>
                );
              })}
              <PageLink
                href={buildHref(searchParams, { page: String(page + 1) })}
                disabled={page >= totalPages}
              >
                Next
              </PageLink>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="flex h-10 items-center rounded-md px-3 text-sm text-ink-muted/50">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="flex h-10 items-center rounded-md px-3 text-sm text-ink transition-colors hover:bg-ink/5"
    >
      {children}
    </Link>
  );
}
