import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Unit + component test runner.
 *
 * Only `tests/unit/**` is picked up here — the `tests/e2e/**` Playwright specs
 * run under their own runner (`pnpm test:e2e`) and must never be collected by
 * Vitest, which is why the include glob is deliberately narrow.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirror the `@/*` -> `./src/*` alias from tsconfig.json so tests import
    // production modules exactly as the app does.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // The pure, testable surface lives in the lib layer; server modules pull
      // in Prisma/Stripe/OpenAI and are exercised through e2e instead.
      include: ["src/lib/**/*.ts"],
      exclude: ["src/**/*.d.ts", "**/*.config.*", "node_modules/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
