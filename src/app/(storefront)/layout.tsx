import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { getCategories } from "@/server/services/catalog";
import { getCart } from "@/server/services/cart";
import { getCurrentUser } from "@/lib/auth";
import type { CategorySummary } from "@/components/storefront/types";

/**
 * Storefront shell. Loads the nav categories and the signed-in user's cart
 * count once for the whole customer surface. Every data call is defensive so a
 * transient service hiccup degrades to an empty nav rather than a 500.
 */
async function loadShell(): Promise<{
  categories: CategorySummary[];
  cartCount: number;
  user: { name?: string | null; email?: string | null } | null;
}> {
  try {
    const [categories, user] = await Promise.all([
      getCategories().catch(() => [] as CategorySummary[]),
      getCurrentUser().catch(() => null),
    ]);

    let cartCount = 0;
    if (user) {
      const cart = await getCart(user.id).catch(() => null);
      cartCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
    }

    return { categories: categories ?? [], cartCount, user };
  } catch {
    return { categories: [], cartCount: 0, user: null };
  }
}

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const { categories, cartCount, user } = await loadShell();

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <Header categories={categories} cartCount={cartCount} user={user} />
      <main className="flex-1">{children}</main>
      <Footer categories={categories} />
    </div>
  );
}
