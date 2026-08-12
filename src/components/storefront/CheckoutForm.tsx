"use client";

import * as React from "react";
import { loadStripe, type Stripe, type Appearance } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCheckout } from "@/server/actions/checkout";

/**
 * Stripe Payment Element checkout. The parent (a server component) renders this
 * without a client secret; on submit we first save the shipping address and
 * create the order + PaymentIntent via the `createCheckout` server action, then
 * confirm the payment with the returned secret. The Stripe instance is created
 * once at module scope from the public publishable key.
 */

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise: Promise<Stripe | null> | null = publishableKey
  ? loadStripe(publishableKey)
  : null;

// Match the Payment Element to the LuxeMarket palette.
const appearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#B8945F",
    colorText: "#0B0B0C",
    colorBackground: "#ffffff",
    colorDanger: "#B4432B",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    borderRadius: "8px",
    spacingUnit: "4px",
  },
};

const FIELD =
  "flex h-11 w-full rounded-md border border-ink/15 bg-white px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/30";

export function CheckoutForm() {
  if (!stripePromise) {
    return (
      <div className="rounded-lg border border-ink/8 bg-white p-6 text-sm text-ink-muted shadow-card">
        Payments are being configured. Please add your Stripe keys to enable checkout.
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ appearance }}>
      <CheckoutFormInner />
    </Elements>
  );
}

function CheckoutFormInner() {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [placingOrder, setPlacingOrder] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [address, setAddress] = React.useState({
    fullName: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    phone: "",
  });

  function set<K extends keyof typeof address>(key: K, value: string) {
    setAddress((prev) => ({ ...prev, [key]: value }));
  }

  // Step 1: persist the address, snapshot the order, open a PaymentIntent.
  async function placeOrder() {
    if (placingOrder) return;
    setPlacingOrder(true);
    setError(null);
    try {
      const result = await createCheckout(address);
      setClientSecret(result.clientSecret);
      return result;
    } catch (err) {
      const message =
        err instanceof Error && /zod/i.test(err.name) ? "Please review your details." : null;
      setError(message ?? (err as Error).message ?? "We couldn't place your order. Please try again.");
      return null;
    } finally {
      setPlacingOrder(false);
    }
  }

  // Step 2: confirm the payment with Stripe (redirects on success).
  async function confirmPayment() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
        shipping: {
          name: address.fullName,
          phone: address.phone || undefined,
          address: {
            line1: address.line1,
            line2: address.line2 || undefined,
            city: address.city,
            state: address.state,
            postal_code: address.postalCode,
            country: address.country,
          },
        },
      },
    });

    // Reached only when confirmation fails before redirect.
    if (submitError) {
      setError(submitError.message ?? "We couldn't process your payment. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe) return;
    if (!clientSecret) {
      const placed = await placeOrder();
      if (!placed) return;
    }
    await confirmPayment();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <section>
        <h2 className="font-serif text-xl tracking-tight text-ink">Shipping address</h2>
        <p className="mt-1 text-sm text-ink-muted">Where should we deliver your order?</p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <Field label="Full name" className="col-span-2">
            <Input required value={address.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Ada Lovelace" />
          </Field>
          <Field label="Address" className="col-span-2">
            <Input required value={address.line1} onChange={(e) => set("line1", e.target.value)} placeholder="123 Regent Street" />
          </Field>
          <Field label="Apartment, suite (optional)" className="col-span-2">
            <Input value={address.line2} onChange={(e) => set("line2", e.target.value)} placeholder="Flat 4" />
          </Field>
          <Field label="City">
            <Input required value={address.city} onChange={(e) => set("city", e.target.value)} placeholder="London" />
          </Field>
          <Field label="State / Region">
            <Input required value={address.state} onChange={(e) => set("state", e.target.value)} placeholder="Greater London" />
          </Field>
          <Field label="Postal code">
            <Input required value={address.postalCode} onChange={(e) => set("postalCode", e.target.value)} placeholder="W1B 5AH" />
          </Field>
          <Field label="Country">
            <select
              required
              value={address.country}
              onChange={(e) => set("country", e.target.value)}
              className={FIELD}
            >
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="FR">France</option>
              <option value="DE">Germany</option>
              <option value="JP">Japan</option>
            </select>
          </Field>
          <Field label="Phone (optional)" className="col-span-2">
            <Input type="tel" value={address.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 1234" />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl tracking-tight text-ink">Payment</h2>
        <p className="mt-1 text-sm text-ink-muted">All transactions are secure and encrypted.</p>
        {clientSecret ? (
          <div className="mt-6 rounded-lg border border-ink/10 bg-white p-5 shadow-card">
            <PaymentElement options={{ layout: "tabs" }} />
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-ink/10 bg-white p-5 shadow-card text-sm text-ink-muted">
            Review your details above — payment will be collected when you place the order.
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!stripe || placingOrder || submitting}
        className="w-full"
      >
        {(placingOrder || submitting) ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
        {placingOrder ? "Placing order…" : submitting ? "Processing…" : "Pay securely"}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
        <Lock className="h-3 w-3" />
        Secured by Stripe · Your payment details never touch our servers
      </p>
    </form>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
