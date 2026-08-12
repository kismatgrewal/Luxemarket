import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { approveVendor, suspendVendor, listPendingVendors } from "@/server/services/admin";
import {
  VendorApprovalTable,
  type PendingVendorRow,
  type VendorRow,
} from "@/components/admin/VendorApprovalTable";

export const dynamic = "force-dynamic";

// --- Server actions -------------------------------------------------------
// Each mutation re-checks the caller's permission (defence in depth behind the
// middleware guard), writes an audit entry, then revalidates the directory.

async function approveVendorAction(id: string) {
  "use server";
  const user = await getCurrentUser();
  assertCan(user?.role, "vendor:approve");
  // The service records the audit entry and fires onboarding automation.
  await approveVendor(id, user?.id);
  revalidatePath("/admin/vendors");
}

async function suspendVendorAction(id: string) {
  "use server";
  const user = await getCurrentUser();
  assertCan(user?.role, "vendor:approve");
  await suspendVendor(id, user?.id);
  revalidatePath("/admin/vendors");
}

async function rejectVendorAction(id: string) {
  "use server";
  const user = await getCurrentUser();
  assertCan(user?.role, "vendor:approve");
  // No dedicated service call for rejection — record the terminal status and
  // audit entry directly.
  await prisma.$transaction([
    prisma.vendor.update({ where: { id }, data: { status: "REJECTED" } }),
    prisma.auditLog.create({
      data: { actorId: user?.id ?? null, action: "vendor.reject", target: id },
    }),
  ]);
  revalidatePath("/admin/vendors");
}

export default async function AdminVendorsPage() {
  const [pending, allVendors] = await Promise.all([
    listPendingVendors(),
    prisma.vendor.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { products: true } },
      },
    }),
  ]);

  const pendingRows: PendingVendorRow[] = pending.map((v) => ({
    id: v.id,
    storeName: v.storeName,
    slug: v.slug,
    tagline: v.tagline,
    contactName: v.contactName,
    contactEmail: v.contactEmail,
    createdAt: v.appliedAt,
  }));

  const vendorRows: VendorRow[] = allVendors.map((v) => ({
    id: v.id,
    storeName: v.storeName,
    slug: v.slug,
    status: v.status,
    contactEmail: v.user?.email ?? "—",
    productCount: v._count.products,
    commissionBps: v.commissionBps,
    createdAt: v.createdAt,
  }));

  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      <header>
        <p className="eyebrow">Vendors</p>
        <h1 className="display mt-1 text-3xl">Vendor approvals</h1>
        <p className="mt-1 text-ink-muted">
          Review new applications and manage the standing of every store on the marketplace.
        </p>
      </header>

      <VendorApprovalTable
        pending={pendingRows}
        vendors={vendorRows}
        approveAction={approveVendorAction}
        rejectAction={rejectVendorAction}
        suspendAction={suspendVendorAction}
      />
    </div>
  );
}
