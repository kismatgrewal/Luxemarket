import { redirect } from "next/navigation";
import type { User, Vendor } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Shared session helpers for the vendor dashboard. Every route under
 * `/vendor` resolves the signed-in seller's store through one of these so the
 * access rules — signed in, VENDOR role, onboarded — live in a single place.
 *
 * A store's lifecycle: a VENDOR account always owns a `Vendor` row (created at
 * sign-up in PENDING). Pending stores are funnelled to `/vendor/onboarding`
 * until an admin approves them; the data-heavy dashboard pages require an
 * approved store, while onboarding-adjacent pages (settings, add product) stay
 * reachable so the seller can finish setting up.
 */

export type VendorWithUser = Vendor & {
  user: Pick<User, "id" | "name" | "email" | "image">;
};

/** The current vendor's store, or `null` when the account has no store yet. */
export async function getVendorOrNull(): Promise<VendorWithUser | null> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/vendor");
  if (user.role !== "VENDOR") redirect("/");

  return prisma.vendor.findUnique({
    where: { userId: user.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });
}

/** Require a store to exist (any status). Missing → onboarding. */
export async function requireVendor(): Promise<VendorWithUser> {
  const vendor = await getVendorOrNull();
  if (!vendor) redirect("/vendor/onboarding");
  return vendor;
}

/** Require an approved store for the reporting pages. Pending → onboarding. */
export async function requireActiveVendor(): Promise<VendorWithUser> {
  const vendor = await requireVendor();
  if (vendor.status === "PENDING") redirect("/vendor/onboarding");
  return vendor;
}
