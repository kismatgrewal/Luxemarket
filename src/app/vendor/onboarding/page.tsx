import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Check,
  CreditCard,
  Package,
  ShieldCheck,
  Store,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getVendorOrNull } from "../_data";

export const metadata: Metadata = { title: "Get started" };

type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
  done: boolean;
  cta: { label: string; href: string };
};

export default async function VendorOnboardingPage() {
  const vendor = await getVendorOrNull();

  // Approved sellers don't need the onboarding funnel.
  if (vendor?.status === "APPROVED") redirect("/vendor");

  const productCount = vendor
    ? await prisma.product.count({ where: { vendorId: vendor.id } })
    : 0;

  const steps: Step[] = [
    {
      icon: Store,
      title: "Store details",
      description: "Add your store name, tagline, and the story behind your craft.",
      done: Boolean(vendor?.storeName),
      cta: { label: "Edit store details", href: "/vendor/settings" },
    },
    {
      icon: CreditCard,
      title: "Payouts",
      description: "Connect Stripe so we can send your earnings straight to your bank.",
      done: Boolean(vendor?.stripeAccountId),
      cta: { label: "Connect with Stripe", href: "/vendor/settings" },
    },
    {
      icon: Package,
      title: "First product",
      description: "List your first item — save it as a draft and publish when you're ready.",
      done: productCount > 0,
      cta: { label: "Add a product", href: "/vendor/products/new" },
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4">
      <div className="text-center">
        <p className="eyebrow">Welcome to LuxeMarket</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-ink">
          Let&apos;s set up your store
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
          Three quick steps and you&apos;ll be ready to sell. Your store is reviewed by our team
          before it goes live.
        </p>
      </div>

      {/* Progress */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-ink">Setup progress</span>
          <span className="text-ink-muted">
            {completed} of {steps.length} complete
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-ivory-deep">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${(completed / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className={cn(
              "flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-card sm:flex-row sm:items-center",
              step.done ? "border-emerald/25" : "border-ink/8",
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                step.done ? "bg-emerald/10 text-emerald" : "bg-gold/10 text-gold-deep",
              )}
            >
              {step.done ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                  Step {index + 1}
                </span>
                {step.done ? <Badge variant="success">Done</Badge> : null}
              </div>
              <h2 className="mt-0.5 font-serif text-lg text-ink">{step.title}</h2>
              <p className="text-sm text-ink-muted">{step.description}</p>
            </div>

            <Button
              asChild
              variant={step.done ? "outline" : "gold"}
              size="sm"
              className="shrink-0"
            >
              <Link href={step.cta.href}>
                {step.cta.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </li>
        ))}
      </ol>

      {/* Review note */}
      <div className="flex items-start gap-3 rounded-lg bg-ink px-5 py-4 text-ivory">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-soft" />
        <div className="text-sm">
          <p className="font-medium">
            {allDone ? "You're all set — sit tight" : "What happens next"}
          </p>
          <p className="mt-0.5 text-ivory/70">
            {allDone
              ? "Your store is queued for review. We typically approve new sellers within 1–2 business days and will email you the moment you're live."
              : "Once you've completed these steps, our team reviews your store — usually within 1–2 business days — and you'll be ready to sell."}
          </p>
        </div>
      </div>
    </div>
  );
}
