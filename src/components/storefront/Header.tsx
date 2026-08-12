import Link from "next/link";
import { Menu, Search, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategorySummary } from "./types";

interface HeaderUser {
  name?: string | null;
  email?: string | null;
}

/**
 * Storefront masthead: a thin announcement rail above a sticky bar carrying the
 * serif wordmark, primary navigation, a GET-based search field, and the account
 * and cart affordances. The mobile menu is a no-JS `<details>` disclosure, so
 * the whole header renders as a server component.
 */
export function Header({
  categories = [],
  cartCount = 0,
  user,
}: {
  categories?: CategorySummary[];
  cartCount?: number;
  user?: HeaderUser | null;
}) {
  const navCategories = categories.slice(0, 5);

  return (
    <header className="sticky top-0 z-50 border-b border-ink/8 bg-ivory/85 backdrop-blur-md">
      <div className="bg-ink text-ivory">
        <div className="container flex h-9 items-center justify-center gap-2 text-center text-[0.7rem] font-medium uppercase tracking-[0.18em] text-ivory/80">
          Complimentary shipping over $200
          <span className="hidden text-gold-soft sm:inline">·</span>
          <span className="hidden sm:inline">Concierge sourcing for members</span>
        </div>
      </div>

      <div className="container flex h-16 items-center justify-between gap-4 md:h-20">
        {/* Left: mobile menu + wordmark */}
        <div className="flex items-center gap-3">
          <details className="group relative lg:hidden">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md text-ink hover:bg-ink/5 [&::-webkit-details-marker]:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </summary>
            <div className="absolute left-0 top-12 z-50 w-64 rounded-lg border border-ink/10 bg-white p-2 shadow-lift">
              <form action="/search" className="p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <input
                    name="q"
                    placeholder="Search"
                    className="h-10 w-full rounded-md border border-ink/15 bg-white pl-9 pr-3 text-sm outline-none focus:border-gold"
                  />
                </div>
              </form>
              <nav className="flex flex-col p-1">
                <MobileLink href="/search">Shop all</MobileLink>
                {navCategories.map((c) => (
                  <MobileLink key={c.id} href={`/search?categorySlug=${c.slug}`}>
                    {c.name}
                  </MobileLink>
                ))}
                <MobileLink href="/vendors">Makers</MobileLink>
                <MobileLink href="/orders">Orders</MobileLink>
              </nav>
            </div>
          </details>

          <Link href="/" className="font-serif text-xl font-medium tracking-tight text-ink sm:text-2xl">
            LuxeMarket
          </Link>
        </div>

        {/* Center: primary nav */}
        <nav className="hidden items-center gap-7 lg:flex">
          <NavLink href="/search">Shop all</NavLink>
          {navCategories.map((c) => (
            <NavLink key={c.id} href={`/search?categorySlug=${c.slug}`}>
              {c.name}
            </NavLink>
          ))}
          <NavLink href="/vendors">Makers</NavLink>
        </nav>

        {/* Right: search + account + cart */}
        <div className="flex items-center gap-1 sm:gap-2">
          <form action="/search" className="hidden md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                name="q"
                placeholder="Search"
                aria-label="Search products"
                className="h-10 w-40 rounded-full border border-ink/12 bg-white/60 pl-9 pr-4 text-sm text-ink outline-none transition-[width,border-color] placeholder:text-ink-muted focus:w-56 focus:border-gold lg:w-44"
              />
            </div>
          </form>

          <Link
            href={user ? "/account" : "/login"}
            className="flex h-10 w-10 items-center justify-center rounded-md text-ink transition-colors hover:bg-ink/5"
            aria-label={user ? "Your account" : "Sign in"}
          >
            <User className="h-5 w-5" strokeWidth={1.5} />
          </Link>

          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-md text-ink transition-colors hover:bg-ink/5"
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[0.6rem] font-semibold tabular-nums text-ink">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-ink/80 transition-colors hover:text-ink"
    >
      {children}
    </Link>
  );
}

function MobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn("rounded-md px-3 py-2.5 text-sm font-medium text-ink hover:bg-ivory-deep")}
    >
      {children}
    </Link>
  );
}
