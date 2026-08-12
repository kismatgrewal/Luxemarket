import { expect, test, type Page } from "@playwright/test";

// Admin console flow: approve a vendor that is awaiting review. Runs only
// against a live app seeded with an admin account and a PENDING vendor.
const LIVE = !!process.env.E2E_LIVE;

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@luxemarket.test";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "admin-password";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in|continue/i }).click();
  await page.waitForURL(/dashboard|admin|account/i);
}

test.describe("Admin vendor approval", () => {
  test("admin approves a pending vendor and status becomes Approved", async ({ page }) => {
    test.skip(!LIVE, "requires a running LuxeMarket dev server + seeded pending vendor");

    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Go to the vendor management screen in the admin console.
    await page.goto("/admin/vendors");
    await expect(page.getByRole("heading", { name: /vendors/i })).toBeVisible();

    // Scope to the first row that is currently pending review.
    const pendingRow = page
      .getByRole("row")
      .filter({ has: page.getByText(/pending/i) })
      .first();
    await expect(pendingRow).toBeVisible();

    // Approve it (button lives inside the row, or in a row action menu).
    const approveButton = pendingRow.getByRole("button", { name: /approve/i });
    if (await approveButton.count()) {
      await approveButton.click();
    } else {
      await pendingRow.getByRole("button", { name: /actions|manage|⋯/i }).click();
      await page.getByRole("menuitem", { name: /approve/i }).click();
    }

    // Confirm a modal if one appears.
    const confirm = page.getByRole("button", { name: /confirm|approve/i });
    if (await confirm.count()) {
      await confirm.first().click();
    }

    // The row now reflects the Approved status and no longer reads Pending.
    await expect(pendingRow.getByText(/approved/i)).toBeVisible();
    await expect(pendingRow.getByText(/pending/i)).toHaveCount(0);
  });
});
