import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { ProductForm, type CategoryOption } from "@/components/vendor/ProductForm";
import { getCategories } from "@/server/services/catalog";
import { getCurrentUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "New product" };

export default async function AdminNewProductPage() {
  const user = await getCurrentUser();
  assertCan(user?.role, "product:write");

  const [categories, vendors] = await Promise.all([
    getCategories(),
    prisma.vendor.findMany({
      where: { status: "APPROVED" },
      orderBy: { storeName: "asc" },
      select: { id: true, storeName: true },
    }),
  ]);

  const categoryOptions: CategoryOption[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/admin/catalog"
          className="inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to catalogue
        </Link>
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">Add a product</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Create a listing on behalf of any approved store. Upload product images from your device.
        </p>
      </div>

      <ProductForm categories={categoryOptions} vendors={vendors} />
    </div>
  );
}