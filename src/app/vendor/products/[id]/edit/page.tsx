import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { ProductForm, type CategoryOption, type ProductFormValue } from "@/components/vendor/ProductForm";
import { prisma } from "@/lib/prisma";
import { getCategories } from "@/server/services/catalog";
import { requireVendor } from "../../../_data";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const vendor = await requireVendor();

  const product = await prisma.product.findFirst({
    where: { id: params.id, vendorId: vendor.id },
    include: {
      images: { orderBy: { position: "asc" } },
      category: { select: { id: true, name: true } },
    },
  });
  if (!product) notFound();

  const categories: CategoryOption[] = (await getCategories()).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const value: ProductFormValue = {
    id: product.id,
    title: product.title,
    categoryId: product.categoryId,
    status: product.status === "ARCHIVED" ? "DRAFT" : product.status,
    description: product.description,
    sku: product.sku,
    inventory: product.inventory,
    priceCents: product.priceCents,
    compareAtCents: product.compareAtCents,
    images: product.images.map((img) => ({ url: img.url })),
  };

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
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">Edit product</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Update the listing details and save your changes.
        </p>
      </div>

      <ProductForm categories={categories} product={value} />
    </div>
  );
}
