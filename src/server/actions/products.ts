"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { generateProductDescription, ProductCopyError } from "@/lib/openai";
import { dispatchN8nEvent } from "@/lib/n8n";
import { prisma } from "@/lib/prisma";
import { assertCan, ForbiddenError } from "@/lib/rbac";
import { slugify } from "@/lib/utils";
import type { ActionResult, GenerateDescriptionResult } from "@/types";

/**
 * Vendor product management actions.
 *
 * Every action is guarded with `assertCan(role, "product:write")` and, for
 * writes to an existing product, an ownership check so a vendor can only touch
 * their own catalog (admins may act on any). All input is Zod-validated and
 * results come back as a discriminated `ActionResult` the client form can switch
 * on without try/catch.
 */

const LOW_STOCK_THRESHOLD = 5;

const imageSchema = z.object({
  url: z.string().url(),
  alt: z.string().trim().max(160).optional(),
});

const productInputSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(140),
  description: z.string().trim().min(20, "Description is too short").max(8_000),
  priceCents: z.number().int().positive("Price must be greater than zero"),
  compareAtCents: z.number().int().positive().optional(),
  currency: z.string().length(3).default("USD"),
  sku: z.string().trim().min(2).max(64),
  inventory: z.number().int().min(0).default(0),
  categoryId: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  aiGenerated: z.boolean().default(false),
  images: z.array(imageSchema).max(8).default([]),
  // Admins may create on behalf of a vendor; vendors ignore this and use their own.
  vendorId: z.string().min(1).optional(),
});

export type ProductInput = z.input<typeof productInputSchema>;

const generateInputSchema = z.object({
  title: z.string().trim().min(3).max(140),
  category: z.string().trim().max(80).optional(),
  attributes: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  tone: z.enum(["premium", "playful", "minimal", "technical", "warm"]).optional(),
});

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Resolve the vendor a write should target, enforcing role rules. */
async function resolveVendorId(
  user: { id: string; role: "CUSTOMER" | "VENDOR" | "ADMIN" },
  requestedVendorId?: string,
): Promise<string> {
  if (user.role === "ADMIN" && requestedVendorId) return requestedVendorId;
  const vendor = await prisma.vendor.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true },
  });
  if (!vendor) throw new Error("No vendor account is associated with this user.");
  if (vendor.status !== "APPROVED") throw new Error("Your store must be approved before publishing.");
  return vendor.id;
}

/** Ensure `slugify(title)` is unique, disambiguating with a short suffix. */
async function uniqueSlug(title: string, ignoreId?: string): Promise<string> {
  const base = slugify(title) || "product";
  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash || clash.id === ignoreId) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** AI-draft copy for the product form. Does not persist anything. */
export async function generateDescriptionAction(
  input: z.input<typeof generateInputSchema>,
): Promise<ActionResult<GenerateDescriptionResult>> {
  const user = await requireUser();
  try {
    assertCan(user.role, "product:write");

    const parsed = generateInputSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid input", parsed.error.flatten().fieldErrors);

    const result = await generateProductDescription(parsed.data);
    return ok(result);
  } catch (err) {
    if (err instanceof ForbiddenError) return fail("You do not have permission to do that.");
    if (err instanceof ProductCopyError) {
      return fail(
        err.code === "not_configured"
          ? "AI copywriting is not configured on this environment."
          : "The copywriter could not generate a draft. Please try again.",
      );
    }
    return fail(err instanceof Error ? err.message : "Something went wrong.");
  }
}

export async function createProductAction(
  input: ProductInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const user = await requireUser();
  try {
    assertCan(user.role, "product:write");

    const parsed = productInputSchema.safeParse(input);
    if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
    const data = parsed.data;

    const vendorId = await resolveVendorId(user, data.vendorId);
    const slug = await uniqueSlug(data.title);

    const product = await prisma.product.create({
      data: {
        vendorId,
        categoryId: data.categoryId ?? null,
        title: data.title,
        slug,
        description: data.description,
        priceCents: data.priceCents,
        compareAtCents: data.compareAtCents ?? null,
        currency: data.currency,
        sku: data.sku,
        inventory: data.inventory,
        status: data.status,
        aiGenerated: data.aiGenerated,
        images: {
          create: data.images.map((img, i) => ({
            url: img.url,
            alt: img.alt ?? data.title,
            position: i,
          })),
        },
      },
      select: { id: true, slug: true },
    });

    revalidatePath("/vendor/products");
    revalidatePath("/(storefront)/shop");
    return ok(product);
  } catch (err) {
    if (err instanceof ForbiddenError) return fail("You do not have permission to do that.");
    // Unique-constraint violation on SKU is the common, actionable failure.
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return fail("That SKU is already in use.", { sku: ["SKU must be unique"] });
    }
    return fail(err instanceof Error ? err.message : "Could not create the product.");
  }
}

const updateSchema = productInputSchema.partial().extend({ id: z.string().min(1) });

export async function updateProductAction(
  input: z.input<typeof updateSchema>,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const user = await requireUser();
  try {
    assertCan(user.role, "product:write");

    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
    const { id, images, vendorId, ...fields } = parsed.data;

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, vendorId: true, title: true, slug: true },
    });
    if (!existing) return fail("Product not found.");
    await assertProductOwnership(user, existing.vendorId);

    // Regenerate the slug only when the title actually changes.
    const slug =
      fields.title && fields.title !== existing.title
        ? await uniqueSlug(fields.title, id)
        : existing.slug;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...fields,
        slug,
        // Admins may move a listing to another store.
        ...(user.role === "ADMIN" && vendorId ? { vendorId } : {}),
        // If images are supplied, replace the set wholesale (simplest correct semantics).
        ...(images
          ? {
              images: {
                deleteMany: {},
                create: images.map((img, i) => ({ url: img.url, alt: img.alt ?? existing.title, position: i })),
              },
            }
          : {}),
      },
      select: { id: true, slug: true },
    });

    revalidatePath("/vendor/products");
    revalidatePath(`/(storefront)/product/${product.slug}`);
    return ok(product);
  } catch (err) {
    if (err instanceof ForbiddenError) return fail("You do not have permission to do that.");
    return fail(err instanceof Error ? err.message : "Could not update the product.");
  }
}

const toggleSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
});

export async function toggleProductStatusAction(
  input: z.input<typeof toggleSchema>,
): Promise<ActionResult<{ id: string; status: "DRAFT" | "ACTIVE" | "ARCHIVED" }>> {
  const user = await requireUser();
  try {
    assertCan(user.role, "product:write");

    const parsed = toggleSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid status change.");
    const { id, status } = parsed.data;

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { vendorId: true, title: true, sku: true, inventory: true },
    });
    if (!existing) return fail("Product not found.");
    await assertProductOwnership(user, existing.vendorId);

    await prisma.product.update({ where: { id }, data: { status } });

    // Publishing a product that's already thin on stock is worth flagging.
    if (status === "ACTIVE" && existing.inventory <= LOW_STOCK_THRESHOLD) {
      void dispatchN8nEvent("product.low_stock", {
        productId: id,
        title: existing.title,
        sku: existing.sku,
        vendorId: existing.vendorId,
        inventory: existing.inventory,
        threshold: LOW_STOCK_THRESHOLD,
      });
    }

    revalidatePath("/vendor/products");
    return ok({ id, status });
  } catch (err) {
    if (err instanceof ForbiddenError) return fail("You do not have permission to do that.");
    return fail(err instanceof Error ? err.message : "Could not change the product status.");
  }
}

/** A vendor may only mutate their own products; admins may mutate any. */
async function assertProductOwnership(
  user: { id: string; role: "CUSTOMER" | "VENDOR" | "ADMIN" },
  productVendorId: string,
): Promise<void> {
  if (user.role === "ADMIN") return;
  const vendor = await prisma.vendor.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!vendor || vendor.id !== productVendorId) {
    throw new ForbiddenError("product:write");
  }
}
