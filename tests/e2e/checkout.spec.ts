import { expect, test } from "@playwright/test";

// These flows exercise a live app (DB + Stripe). They run only when E2E_LIVE is
// set; otherwise each test skips at its first line so the suite stays green in
// CI. Selectors favour accessible roles and visible text over brittle CSS.
const LIVE = !!process.env.E2E_LIVE;

test.describe("Storefront checkout", () => {
  test("browse home → open a product → add to cart → checkout", async ({ page }) => {
    test.skip(!LIVE, "requires a running LuxeMarket dev server");

    // 1. Land on the home page.
    await page.goto("/");
    await expect(page).toHaveTitle(/luxe/i);

    // 2. Navigate into the catalog. Prefer an explicit shop link, fall back to
    //    the products route so the test survives nav copy changes.
    const shopLink = page.getByRole("link", { name: /shop|browse|products|collection/i }).first();
    if (await shopLink.count()) {
      await shopLink.click();
    } else {
      await page.goto("/products");
    }

    // 3. Open the first product. Product cards link to their detail page.
    const firstProduct = page
      .getByRole("link")
      .filter({ has: page.getByRole("img") })
      .first();
    await expect(firstProduct).toBeVisible();
    await firstProduct.click();

    // Product detail shows a heading and a formatted price.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/\$\d/)).toBeVisible();

    // 4. Add to cart.
    await page.getByRole("button", { name: /add to (cart|bag)/i }).click();

    // 5. Go to the cart and continue to checkout.
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: /cart|bag/i })).toBeVisible();
    await expect(page.getByText(/subtotal/i)).toBeVisible();
    await page.getByRole("link", { name: /checkout|proceed/i }).click();

    // 6. Checkout renders an order summary and the Stripe payment element.
    await expect(page).toHaveURL(/checkout/);
    await expect(page.getByText(/order summary|total/i)).toBeVisible();

    // The Stripe Payment Element mounts inside a cross-origin iframe.
    const stripeFrame = page.frameLocator('iframe[title*="payment" i], iframe[name^="__privateStripeFrame"]');
    await expect(stripeFrame.locator("body")).toBeVisible();
  });

  test("empty cart shows an empty state and blocks checkout", async ({ page }) => {
    test.skip(!LIVE, "requires a running LuxeMarket dev server");

    await page.goto("/cart");
    await expect(page.getByText(/your (cart|bag) is empty|nothing here yet/i)).toBeVisible();
    // No checkout affordance when there is nothing to buy.
    await expect(page.getByRole("link", { name: /checkout/i })).toHaveCount(0);
  });
});
