"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/types";

export type CategoryActionResult = ActionResult<{ id: string }>;

const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name must be at least 2 characters").max(60),
  imageUrl: z.string().trim().max(300).optional().transform((v) => (v ? v : undefined)),
});

type CategoryInput = z.input<typeof categorySchema>;

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/admin");
  return user;
}

async function uniqueCategorySlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || "category";
  let slug = base;
  let n = 2;
  while (
    await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    }).then((c) => (excludeId ? c && c.id !== excludeId : !!c))
  ) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function createCategoryAction(input: CategoryInput): Promise<CategoryActionResult> {
  const user = await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const slug = await uniqueCategorySlug(parsed.data.name);
  const category = await prisma.category.create({
    data: { name: parsed.data.name, slug, imageUrl: parsed.data.imageUrl ?? null },
  });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "category.created", target: `${category.name} (${category.id})` },
  });
  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/search");
  redirect("/admin/categories");
}

export async function updateCategoryAction(
  id: string,
  input: CategoryInput,
): Promise<CategoryActionResult> {
  const user = await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const existing = await prisma.category.findUnique({ where: { id }, select: { name: true, slug: true } });
  if (!existing) return { ok: false, error: "Category not found." };

  const slug =
    parsed.data.name !== existing.name
      ? await uniqueCategorySlug(parsed.data.name, id)
      : existing.slug;

  await prisma.category.update({
    where: { id },
    data: { name: parsed.data.name, slug, imageUrl: parsed.data.imageUrl ?? null },
  });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "category.updated", target: `${parsed.data.name} (${id})` },
  });
  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/search");
  redirect("/admin/categories");
}

export async function deleteCategoryAction(id: string): Promise<void> {
  const user = await requireAdmin();
  const category = await prisma.category.findUnique({ where: { id }, select: { name: true } });
  if (!category) return;

  // Detach products and child categories first, then remove the node.
  await prisma.$transaction([
    prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } }),
    prisma.category.updateMany({ where: { parentId: id }, data: { parentId: null } }),
    prisma.category.delete({ where: { id } }),
  ]);
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "category.deleted", target: `${category.name} (${id})` },
  });
  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/search");
}