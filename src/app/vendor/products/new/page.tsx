import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { ProductForm, type CategoryOption } from "@/components/vendor/ProductForm";
import { getCategories } from "@/server/services/catalog";
import { requireVendor } from "../../_data";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireVendor();

  const categories: CategoryOption[] = (await getCategories()).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/vendor/products"
          className="inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to products
        </Link>
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">Add a product</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Draft the listing, then let AI polish the description before you publish.
        </p>
      </div>

      <ProductForm categories={categories} />
    </div>
  );
}
