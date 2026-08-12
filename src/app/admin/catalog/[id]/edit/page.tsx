import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ProductForm, type CategoryOption, type ProductFormValue } from "@/components/vendor/ProductForm";
import { getCategories } from "@/server/services/catalog";
import { getCurrentUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit product" };

export default async function AdminEditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  assertCan(user?.role, "product:write");

  const [product, categories, vendors] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: { images: { orderBy: { position: "asc" }, select: { url: true } } },
    }),
    getCategories(),
    prisma.vendor.findMany({
      where: { status: "APPROVED" },
      orderBy: { storeName: "asc" },
      select: { id: true, storeName: true },
    }),
  ]);

  if (!product) notFound();

  const formValue: ProductFormValue = {
    id: product.id,
    title: product.title,
    categoryId: product.categoryId,
    status: product.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
    description: product.description,
    sku: product.sku,
    inventory: product.inventory,
    priceCents: product.priceCents,
    compareAtCents: product.compareAtCents,
    images: product.images,
    vendorId: product.vendorId,
  };

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
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">
          Edit product
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Update the listing, swap images, move it to another store or change its status.
        </p>
      </div>

      <ProductForm categories={categoryOptions} product={formValue} vendors={vendors} />
    </div>
  );
}