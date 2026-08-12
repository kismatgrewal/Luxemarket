import type { Metadata } from "next";
import type { VendorStatus } from "@prisma/client";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { VendorMobileNav, VendorSidebar } from "@/components/vendor/VendorSidebar";
import { getVendorOrNull } from "./_data";

export const metadata: Metadata = {
  title: { default: "Seller dashboard", template: "%s · Seller · LuxeMarket" },
};

const STATUS_BADGE: Record<VendorStatus, { label: string; variant: BadgeProps["variant"] }> = {
  PENDING: { label: "Pending review", variant: "warning" },
  APPROVED: { label: "Active", variant: "success" },
  SUSPENDED: { label: "Suspended", variant: "danger" },
  REJECTED: { label: "Rejected", variant: "danger" },
};

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const vendor = await getVendorOrNull();
  const status = vendor ? STATUS_BADGE[vendor.status] : null;

  return (
    <div className="flex min-h-screen bg-ivory">
      <VendorSidebar storeSlug={vendor?.slug} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-ink/8 bg-white px-6">
          <div className="min-w-0">
            <p className="truncate font-serif text-lg tracking-tight text-ink">
              {vendor?.storeName ?? "Your store"}
            </p>
            {vendor?.tagline ? (
              <p className="truncate text-xs text-ink-muted">{vendor.tagline}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {status ? <Badge variant={status.variant}>{status.label}</Badge> : null}
            <Avatar
              src={vendor?.logoUrl ?? vendor?.user.image}
              name={vendor?.storeName ?? vendor?.user.name ?? vendor?.user.email ?? "Seller"}
            />
          </div>
        </header>

        <VendorMobileNav />

        <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
