import Link from "next/link";
import { Instagram, Twitter, Youtube } from "lucide-react";
import type { CategorySummary } from "./types";

const SHOP_FALLBACK = [
  { name: "New arrivals", href: "/search?sort=newest" },
  { name: "Watches", href: "/search?categorySlug=watches" },
  { name: "Leather goods", href: "/search?categorySlug=leather-goods" },
  { name: "Home", href: "/search?categorySlug=home" },
];

const COMPANY = [
  { name: "Our story", href: "/about" },
  { name: "Meet the makers", href: "/vendors" },
  { name: "Journal", href: "/journal" },
  { name: "Careers", href: "/careers" },
];

const SUPPORT = [
  { name: "Contact concierge", href: "/support" },
  { name: "Shipping & returns", href: "/support/shipping" },
  { name: "Track an order", href: "/orders" },
  { name: "Authenticity promise", href: "/support/authenticity" },
];

/**
 * Editorial multi-column footer. When live categories are available they seed
 * the "Shop" column; otherwise a curated fallback keeps the layout complete.
 */
export function Footer({ categories = [] }: { categories?: CategorySummary[] }) {
  const shop =
    categories.length > 0
      ? categories.slice(0, 5).map((c) => ({ name: c.name, href: `/search?categorySlug=${c.slug}` }))
      : SHOP_FALLBACK;

  return (
    <footer className="mt-24 border-t border-ink/8 bg-ivory">
      <div className="container py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" className="font-serif text-2xl font-medium tracking-tight text-ink">
              LuxeMarket
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              A curated multi-vendor marketplace connecting independent luxury makers with
              discerning buyers. Craft, considered.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <SocialLink href="https://instagram.com" label="Instagram">
                <Instagram className="h-4 w-4" />
              </SocialLink>
              <SocialLink href="https://twitter.com" label="Twitter">
                <Twitter className="h-4 w-4" />
              </SocialLink>
              <SocialLink href="https://youtube.com" label="YouTube">
                <Youtube className="h-4 w-4" />
              </SocialLink>
            </div>
          </div>

          <FooterColumn title="Shop" links={shop} />
          <FooterColumn title="Company" links={COMPANY} />
          <FooterColumn title="Support" links={SUPPORT} />
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-ink/8 pt-8 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} LuxeMarket. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/legal/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link href="/legal/cookies" className="hover:text-ink">
              Cookies
            </Link>
            <span className="text-ink-muted/70">Secured by Stripe</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { name: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="eyebrow">{title}</h3>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.name}>
            <Link
              href={link.href}
              className="text-sm text-ink/70 transition-colors hover:text-ink"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/12 text-ink transition-colors hover:border-gold hover:text-gold-deep"
    >
      {children}
    </a>
  );
}
