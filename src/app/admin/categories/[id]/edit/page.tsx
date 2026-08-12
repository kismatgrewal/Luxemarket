import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategoryForm } from "../../CategoryForm";

export const metadata: Metadata = { title: "Edit category" };

export default async function AdminEditCategoryPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return <p className="text-ink-muted">Access denied.</p>;

  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category) notFound();

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
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">Edit category</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Update the name, slug or image. Products stay attached.
        </p>
      </div>

      <div className="rounded-lg border border-ink/8 bg-white p-6">
        <CategoryForm
          categoryId={category.id}
          initial={{ name: category.name, imageUrl: category.imageUrl }}
        />
      </div>
    </div>
  );
}