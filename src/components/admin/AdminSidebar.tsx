"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Users,
  ShoppingBag,
  Package,
  Tags,
  ScrollText,
  Wallet,
  ExternalLink,
  Plus,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/vendors", label: "Vendors", icon: Store },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/catalog", label: "Catalog", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/payouts", label: "Payouts", icon: Wallet },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

const QUICK_ACTIONS: NavItem[] = [
  { href: "/admin/catalog/new", label: "Add product", icon: Plus },
  { href: "/admin/categories/new", label: "Add category", icon: Plus },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-6 py-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink font-serif text-lg text-ivory">
          L
        </span>
        <div className="leading-tight">
          <p className="font-serif text-base tracking-tight text-ink">LuxeMarket</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold-deep">
            Admin console
          </p>
        </div>
      </div>

      <div className="px-3 pb-2">
        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted/70">
          Quick actions
        </p>
        <div className="space-y-1">
          {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className="group flex items-center gap-3 rounded-md border border-gold/30 bg-gold/5 px-3 py-2 text-sm font-medium text-gold-deep transition-colors hover:bg-gold/15"
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-ink text-ivory"
                  : "text-ink-muted hover:bg-ink/5 hover:text-ink",
              )}
            >
              <Icon
                className={cn("h-[18px] w-[18px]", active ? "text-gold-soft" : "text-ink-muted")}
                strokeWidth={1.75}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink/8 p-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <ExternalLink className="h-[18px] w-[18px]" strokeWidth={1.75} />
          View storefront
        </Link>
      </div>
    </div>
  );
}

export function AdminShell({
  user,
  children,
}: {
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-ivory">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink/8 bg-white lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-5 rounded-md p-2 text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink/8 bg-ivory/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="rounded-md p-2 text-ink transition-colors hover:bg-ink/5 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
              Operations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-ink">
                {user?.name ?? "Administrator"}
              </p>
              <p className="text-xs leading-tight text-ink-muted">{user?.email ?? ""}</p>
            </div>
            <Badge className="bg-ink text-ivory">Admin</Badge>
            <Avatar src={user?.image} name={user?.name ?? "Admin"} />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}