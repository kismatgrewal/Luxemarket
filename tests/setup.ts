// Global test setup, loaded once before the unit suite (see vitest.config.ts).
//
// Registers the jest-dom matchers (`toBeInTheDocument`, `toHaveTextContent`, …)
// against Vitest's `expect`, and resets the jsdom tree between tests so that
// component renders never leak into one another.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
