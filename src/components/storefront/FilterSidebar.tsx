import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CategorySummary } from "./types";

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
] as const;

export interface FilterState {
  q?: string;
  categorySlug?: string;
  sort?: string;
  min?: string;
  max?: string;
}

/**
 * Catalogue filters as a single GET form so the whole thing works without
 * client JS: submitting navigates to `/search` with the chosen params. The
 * active search term rides along in a hidden field; "Clear" links back to a
 * bare listing. Prices are entered in whole currency units.
 */
export function FilterSidebar({
  categories,
  current,
  className,
}: {
  categories: CategorySummary[];
  current: FilterState;
  className?: string;
}) {
  const activeCategory = current.categorySlug ?? "";

  return (
    <form action="/search" className={cn("space-y-8", className)}>
      {current.q ? <input type="hidden" name="q" value={current.q} /> : null}

      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg tracking-tight text-ink">Refine</h2>
        <Link href="/search" className="text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline">
          Clear all
        </Link>
      </div>

      <fieldset>
        <legend className="eyebrow mb-3">Category</legend>
        <div className="space-y-1">
          <RadioRow name="categorySlug" value="" label="All categories" checked={activeCategory === ""} />
          {categories.map((category) => (
            <RadioRow
              key={category.id}
              name="categorySlug"
              value={category.slug}
              label={category.name}
              count={category.productCount}
              checked={activeCategory === category.slug}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3">Price</legend>
        <div className="flex items-center gap-2">
          <label className="flex-1">
            <span className="sr-only">Minimum price</span>
            <input
              type="number"
              name="min"
              min={0}
              inputMode="numeric"
              defaultValue={current.min ?? ""}
              placeholder="Min"
              className="h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm text-ink outline-none focus:border-gold"
            />
          </label>
          <span className="text-ink-muted">—</span>
          <label className="flex-1">
            <span className="sr-only">Maximum price</span>
            <input
              type="number"
              name="max"
              min={0}
              inputMode="numeric"
              defaultValue={current.max ?? ""}
              placeholder="Max"
              className="h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm text-ink outline-none focus:border-gold"
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3">Sort by</legend>
        <select
          name="sort"
          defaultValue={current.sort ?? "featured"}
          className="h-11 w-full rounded-md border border-ink/15 bg-white px-3 text-sm text-ink outline-none focus:border-gold"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </fieldset>

      <button
        type="submit"
        className="h-11 w-full rounded-md bg-ink text-sm font-medium text-ivory transition-colors hover:bg-ink-soft"
      >
        Apply filters
      </button>
    </form>
  );
}

function RadioRow({
  name,
  value,
  label,
  count,
  checked,
}: {
  name: string;
  value: string;
  label: string;
  count?: number;
  checked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-ivory-deep has-[:checked]:text-ink">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="h-4 w-4 shrink-0 rounded-full border border-ink/25 bg-white transition-all peer-checked:border-[5px] peer-checked:border-gold-deep peer-focus-visible:ring-2 peer-focus-visible:ring-gold/40" />
      <span className="flex-1 text-ink-muted peer-checked:text-ink">{label}</span>
      {typeof count === "number" && <span className="text-xs text-ink-muted/70">{count}</span>}
    </label>
  );
}
