"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Editorial newsletter capture. Kept client-side so the confirmation state is
 * immediate; a real submission would post to the marketing service, but the
 * component intentionally owns only the presentation and validation.
 */
export function Newsletter({ className }: { className?: string }) {
  const [email, setEmail] = React.useState("");
  const [done, setDone] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setDone(true);
  }

  return (
    <section className={cn("container", className)}>
      <div className="relative overflow-hidden rounded-2xl bg-ivory-deep px-6 py-16 sm:px-16 sm:py-20">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative mx-auto max-w-xl text-center">
          <span className="eyebrow">The dispatch</span>
          <h2 className="mt-3 font-serif text-3xl tracking-tight text-ink sm:text-4xl">
            Considered reading, twice a month
          </h2>
          <p className="mt-4 text-ink-muted">
            New arrivals, maker stories, and the occasional private sale — sent with restraint.
          </p>

          {done ? (
            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald/10 px-5 py-3 text-sm font-medium text-emerald">
              <Check className="h-4 w-4" />
              You&apos;re on the list. Welcome.
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <Input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 flex-1"
              />
              <Button type="submit" variant="primary" size="lg">
                Subscribe
              </Button>
            </form>
          )}

          <p className="mt-4 text-xs text-ink-muted">
            By subscribing you agree to our privacy policy. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
