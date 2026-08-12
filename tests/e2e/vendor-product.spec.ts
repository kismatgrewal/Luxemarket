import { expect, test, type Page } from "@playwright/test";

// Vendor product-authoring flow, including the OpenAI "Generate with AI" copy
// assist. Runs only against a live app seeded with a vendor account.
const LIVE = !!process.env.E2E_LIVE;

const VENDOR_EMAIL = process.env.E2E_VENDOR_EMAIL ?? "vendor@luxemarket.test";
const VENDOR_PASSWORD = process.env.E2E_VENDOR_PASSWORD ?? "vendor-password";

// Sign in through the NextAuth credentials form.
async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in|continue/i }).click();
  await page.waitForURL(/dashboard|vendor|account/i);
}

test.describe("Vendor product management", () => {
  test("vendor creates a product with AI copy and sees it in the list", async ({ page }) => {
    test.skip(!LIVE, "requires a running LuxeMarket dev server + seeded vendor");

    await signIn(page, VENDOR_EMAIL, VENDOR_PASSWORD);

    // Open the new-product form from the vendor dashboard.
    await page.goto("/vendor/products/new");
    await expect(page.getByRole("heading", { name: /new product|add product|create/i })).toBeVisible();

    // A unique title keeps the run idempotent across repeated executions.
    const title = `Test Silk Scarf ${Date.now()}`;
    await page.getByLabel(/title|name/i).fill(title);
    await page.getByLabel(/price/i).fill("129.00");
    await page.getByLabel(/sku/i).fill(`SKU-${Date.now()}`);

    // Trigger the OpenAI description generator and wait for it to populate the
    // description field (the field is disabled while streaming).
    const description = page.getByLabel(/description/i);
    await page.getByRole("button", { name: /generate with ai|generate description/i }).click();
    await expect(description).not.toHaveValue("", { timeout: 30_000 });

    // Save and confirm a success signal.
    await page.getByRole("button", { name: /save|create|publish/i }).click();
    await expect(page.getByText(/saved|created|success/i)).toBeVisible();

    // The new product appears in the vendor's product list.
    await page.goto("/vendor/products");
    await expect(page.getByRole("cell", { name: title }).or(page.getByText(title))).toBeVisible();
  });
});
