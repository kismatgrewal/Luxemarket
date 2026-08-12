import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  CatalogModerationTable,
  type AdminProductRow,
} from "@/components/admin/CatalogModerationTable";

export const dynamic = "force-dynamic";

// --- Moderation server actions -------------------------------------------
// The admin service doesn't cover catalog moderation, so these operate on the
// product directly, guarded by the same catalog write permission vendors use.

async function archiveProductAction(id: string) {
  "use server";
  const user = await getCurrentUser();
  assertCan(user?.role, "product:write");
  await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  await prisma.auditLog.create({
    data: { actorId: user?.id, action: "product.archived", target: id },
  });
  revalidatePath("/admin/catalog");
}

async function flagProductAction(id: string) {
  "use server";
  const user = await getCurrentUser();
  assertCan(user?.role, "product:write");
  // Flagging pulls the listing back to DRAFT so it leaves the storefront while
  // the vendor is asked to revise it.
  await prisma.product.update({ where: { id }, data: { status: "DRAFT" } });
  await prisma.auditLog.create({
    data: { actorId: user?.id, action: "product.flagged", target: id },
  });
  revalidatePath("/admin/catalog");
}

async function deleteProductAction(id: string) {
  "use server";
  const user = await getCurrentUser();
  // Hard delete is an admin-only destructive action.
  if (user?.role !== "ADMIN") throw new Error("Only admins can delete products.");
  const product = await prisma.product.findUnique({ where: { id }, select: { title: true } });
  if (!product) return;
  await prisma.product.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "product.deleted", target: `${product.title} (${id})` },
  });
  revalidatePath("/admin/catalog");
}

export default async function AdminCatalogPage() {
  const products = await prisma.product.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      vendor: { select: { storeName: true } },
      category: { select: { name: true } },
    },
  });

  const rows: AdminProductRow[] = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    vendorName: p.vendor.storeName,
    categoryName: p.category?.name ?? null,
    status: p.status,
    priceCents: p.priceCents,
    currency: p.currency,
    inventory: p.inventory,
    aiGenerated: p.aiGenerated,
    createdAt: p.createdAt,
  }));

  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 className="display mt-1 text-3xl">Catalog moderation</h1>
          <p className="mt-1 text-ink-muted">
            Products across every vendor. Flag a listing for revision or archive it from the
            storefront.
          </p>
        </div>
        <Link
          href="/admin/catalog/new"
          className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-gold-dark"
        >
          <Plus className="h-4 w-4" />
          Add product
        </Link>
      </header>

      <CatalogModerationTable
        products={rows}
        flagAction={flagProductAction}
        archiveAction={archiveProductAction}
        deleteAction={deleteProductAction}
      />
    </div>
  );
}
