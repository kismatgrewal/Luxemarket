import Link from "next/link";
import type { Metadata } from "next";
import {
  ChevronRight,
  LayoutDashboard,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "./SignOutButton";

export const metadata: Metadata = { title: "Your account" };

const ROLE_LABEL = {
  CUSTOMER: "Customer",
  VENDOR: "Seller",
  ADMIN: "Administrator",
} as const;

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="container flex flex-col items-center py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ivory-deep text-ink-muted">
          <UserRound className="h-7 w-7" strokeWidth={1.5} />
        </span>
        <h1 className="mt-6 font-serif text-3xl tracking-tight text-ink">Sign in to your account</h1>
        <p className="mt-3 max-w-sm text-ink-muted">
          Manage your profile, orders and membership in one place.
        </p>
        <Link
          href="/login?callbackUrl=/account"
          className="mt-8 inline-flex h-11 items-center rounded-md bg-ink px-6 text-sm font-medium text-ivory transition-colors hover:bg-ink-soft"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const [dbUser, orderCount, addressCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { createdAt: true } }),
    prisma.order.count({ where: { customerId: user.id } }),
    prisma.address.count({ where: { userId: user.id } }),
  ]);
  const memberSince = dbUser?.createdAt ?? new Date();

  const links = [
    { href: "/orders", label: "Orders", hint: `${orderCount} ${orderCount === 1 ? "order" : "orders"}`, icon: ShoppingBag },
    { href: "/cart", label: "Shopping bag", hint: "View and edit your bag", icon: Package },
    ...(user.role === "VENDOR"
      ? [{ href: "/vendor", label: "Seller dashboard", hint: "Manage your store", icon: Store }]
      : []),
    ...(user.role === "ADMIN"
      ? [{ href: "/admin", label: "Admin console", hint: "Platform management", icon: LayoutDashboard }]
      : []),
  ];

  return (
    <div className="container py-10 md:py-14">
      <header className="border-b border-ink/8 pb-6">
        <h1 className="font-serif text-3xl tracking-tight text-ink sm:text-4xl">Your account</h1>
        <p className="mt-2 text-sm text-ink-muted">Everything about your LuxeMarket membership.</p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Profile card */}
        <aside>
          <div className="rounded-lg border border-ink/8 bg-white p-6 shadow-card">
            <div className="flex items-center gap-4">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold-deep">
                  <UserRound className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-serif text-lg text-ink">{user.name ?? "Member"}</p>
                <p className="truncate text-sm text-ink-muted">{user.email}</p>
              </div>
            </div>

            <dl className="mt-6 space-y-3 border-t border-ink/8 pt-5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-muted">Role</dt>
                <dd className="inline-flex items-center gap-1.5 font-medium text-ink">
                  <ShieldCheck className="h-3.5 w-3.5 text-gold-deep" />
                  {ROLE_LABEL[user.role]}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-muted">Saved addresses</dt>
                <dd className="font-medium tabular-nums text-ink">{addressCount}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-muted">Member since</dt>
                <dd className="tabular-nums text-ink">
                  {memberSince.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>

            <div className="mt-6 border-t border-ink/8 pt-5">
              <SignOutButton />
            </div>
          </div>
        </aside>

        {/* Quick links */}
        <section>
          <h2 className="font-serif text-xl tracking-tight text-ink">Quick links</h2>
          <ul className="mt-4 divide-y divide-ink/8 overflow-hidden rounded-lg border border-ink/8 bg-white shadow-card">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ivory-deep"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ivory-deep text-gold-deep">
                    <link.icon className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink">{link.label}</span>
                    <span className="block text-xs text-ink-muted">{link.hint}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-ink-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
