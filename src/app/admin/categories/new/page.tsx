import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { CategoryForm } from "../CategoryForm";

export const metadata: Metadata = { title: "New category" };

export default function AdminNewCategoryPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin/categories"
          className="inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to categories
        </Link>
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">New category</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Add a storefront category with an optional image.
        </p>
      </div>

      <div className="rounded-lg border border-ink/8 bg-white p-6">
        <CategoryForm />
      </div>
    </div>
  );
}