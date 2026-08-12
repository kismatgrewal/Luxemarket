import Stripe from "stripe";

import { env } from "@/lib/env";

/**
 * Shared server-side Stripe client. The API version is pinned so upgrades to
 * the `stripe` package can't silently change request/response shapes.
 *
 * Construction is deferred until first use via a Proxy, so importing this
 * module never throws when `STRIPE_SECRET_KEY` is absent (e.g. a preview
 * deploy without payments configured). A missing key surfaces at call time.
 */
let client: Stripe | null = null;

function getStripe(): Stripe {
  if (!client) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set — Stripe features are unavailable.");
    }
    client = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
      appInfo: { name: "LuxeMarket", version: "1.4.0" },
    });
  }
  return client;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const value = getStripe()[prop as keyof Stripe];
    return typeof value === "function" ? (value as Function).bind(getStripe()) : value;
  },
});
