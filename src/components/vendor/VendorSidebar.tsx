"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Wallet,
  Settings,
  Store,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match the pathname exactly rather than by prefix (used for the index route). */
  exact?: boolean;
};

const NAV: NavItem[] = [
  { href: "/vendor", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/vendor/products", label: "Products", icon: Package },
  { href: "/vendor/orders", label: "Orders", icon: ShoppingBag },
  { href: "/vendor/payouts", label: "Payouts", icon: Wallet },
  { href: "/vendor/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/** Fixed left navigation rail for the vendor dashboard (desktop). */
export function VendorSidebar({ storeSlug }: { storeSlug?: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-ink/8 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-ink/8 px-6">
        <Store className="h-5 w-5 text-gold-deep" />
        <span className="font-serif text-lg tracking-tight text-ink">LuxeMarket</span>
        <span className="ml-1 rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-muted">
          Seller
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-ink text-ivory"
                  : "text-ink-muted hover:bg-ivory-deep hover:text-ink",
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  active ? "text-gold-soft" : "text-ink-muted group-hover:text-ink",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {storeSlug ? (
        <div className="border-t border-ink/8 p-4">
          <Link
            href={`/store/${storeSlug}`}
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-ivory-deep hover:text-ink"
          >
            View storefront
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </aside>
  );
}

/** Horizontal, scrollable version of the nav for narrow viewports. */
export function VendorMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-ink/8 bg-white px-4 py-2 lg:hidden">
      {NAV.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-ink text-ivory" : "text-ink-muted hover:bg-ivory-deep",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
