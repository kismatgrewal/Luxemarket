import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end configuration for LuxeMarket.
 *
 * The specs are written against a running dev server on port 3000. They are
 * self-skipping (`test.skip(!process.env.E2E_LIVE, …)`) so the suite is green
 * in CI without a database; set `E2E_LIVE=1` and start the app to run them for
 * real. Uncomment `webServer` below to have Playwright boot the app itself.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // webServer: {
  //   command: "pnpm dev",
  //   url: "http://localhost:3000",
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
