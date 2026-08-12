"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  storeName: z.string().trim().min(2, "Store name is required"),
  tagline: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  bannerUrl: z.string().trim().url().optional().or(z.literal("")),
});

/**
 * Persist edits to the vendor's public store profile. Progressive-enhancement
 * friendly: called directly as a `<form action>` and re-reads state from the
 * query string (`?saved=1` / `?error=1`) after redirecting back.
 */
export async function updateVendorProfileAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/vendor/settings");
  assertCan(user.role, "vendor:manage");

  const parsed = profileSchema.safeParse({
    storeName: formData.get("storeName"),
    tagline: formData.get("tagline"),
    description: formData.get("description"),
    logoUrl: formData.get("logoUrl"),
    bannerUrl: formData.get("bannerUrl"),
  });

  if (!parsed.success) redirect("/vendor/settings?error=1");
  const data = parsed.data;

  // Slug is intentionally left untouched — it anchors the public storefront URL.
  await prisma.vendor.update({
    where: { userId: user.id },
    data: {
      storeName: data.storeName,
      tagline: data.tagline || null,
      description: data.description || null,
      logoUrl: data.logoUrl || null,
      bannerUrl: data.bannerUrl || null,
    },
  });

  revalidatePath("/vendor/settings");
  revalidatePath("/vendor");
  redirect("/vendor/settings?saved=1");
}
