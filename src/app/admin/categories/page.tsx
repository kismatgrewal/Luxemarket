import Link from "next/link";
import { Plus, Trash2, Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteCategoryAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") {
    // Middleware guards /admin; fail closed if ever bypassed.
    return <p className="text-ink-muted">Access denied.</p>;
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: true } },
      parent: { select: { name: true } },
    },
  });

  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 className="display mt-1 text-3xl">Categories</h1>
          <p className="mt-1 text-ink-muted">
            Create, edit and remove storefront categories.
          </p>
        </div>
        <Link
          href="/admin/categories/new"
          className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-gold-dark"
        >
          <Plus className="h-4 w-4" />
          Add category
        </Link>
      </header>

      <div className="overflow-hidden rounded-lg border border-ink/8 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/8 bg-ivory-deep/60 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Slug</th>
                <th className="px-5 py-3">Parent</th>
                <th className="px-5 py-3">Products</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-ivory-deep/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.imageUrl}
                          alt=""
                          className="h-10 w-10 rounded-md border border-ink/8 object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-ink/8 bg-ivory-deep text-xs text-ink-muted">
                          —
                        </span>
                      )}
                      <span className="font-medium text-ink">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-ink-muted">{c.slug}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{c.parent?.name ?? "—"}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{c._count.products}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/categories/${c.id}/edit`}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                      <form
                        action={async () => {
                          "use server";
                          await deleteCategoryAction(c.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-ink-muted">
                    No categories yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}