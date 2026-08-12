import type { Metadata } from "next";
import { AlertCircle, CheckCircle2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireVendor } from "../_data";
import { updateVendorProfileAction } from "./actions";

export const metadata: Metadata = { title: "Settings" };

const textareaClass =
  "flex w-full rounded-md border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm transition-colors placeholder:text-ink-muted focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export default async function VendorSettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const vendor = await requireVendor();
  const commissionPct = (vendor.commissionBps / 100).toFixed(vendor.commissionBps % 100 ? 1 : 0);
  const keepPct = (100 - vendor.commissionBps / 100).toFixed(vendor.commissionBps % 100 ? 1 : 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="eyebrow">Store</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Manage how your store appears to shoppers across LuxeMarket.
        </p>
      </div>

      {searchParams.saved ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald/20 bg-emerald/5 p-3 text-sm text-emerald">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Your store profile has been saved.
        </div>
      ) : null}
      {searchParams.error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          We couldn&apos;t save your changes. Please check the fields and try again.
        </div>
      ) : null}

      <form action={updateVendorProfileAction} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Store name"
              htmlFor="storeName"
              hint={`Public URL: luxemarket.com/store/${vendor.slug}`}
            >
              <Input
                id="storeName"
                name="storeName"
                defaultValue={vendor.storeName}
                required
                minLength={2}
              />
            </Field>
            <Field label="Tagline" htmlFor="tagline" hint="A short line shown under your store name.">
              <Input
                id="tagline"
                name="tagline"
                defaultValue={vendor.tagline ?? ""}
                maxLength={120}
                placeholder="Heritage leather, made to last"
              />
            </Field>
            <Field label="Description" htmlFor="description">
              <textarea
                id="description"
                name="description"
                rows={5}
                maxLength={2000}
                defaultValue={vendor.description ?? ""}
                placeholder="Tell shoppers about your craft, materials, and story…"
                className={textareaClass}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Logo URL" htmlFor="logoUrl" hint="Square image works best (min. 256×256).">
              <Input
                id="logoUrl"
                name="logoUrl"
                type="url"
                defaultValue={vendor.logoUrl ?? ""}
                placeholder="https://…"
              />
            </Field>
            <Field label="Banner URL" htmlFor="bannerUrl" hint="Wide image for your storefront header.">
              <Input
                id="bannerUrl"
                name="bannerUrl"
                type="url"
                defaultValue={vendor.bannerUrl ?? ""}
                placeholder="https://…"
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" size="lg">
            Save changes
          </Button>
        </div>
      </form>

      {/* Commission — read-only, set by the marketplace */}
      <Card>
        <CardHeader>
          <CardTitle>Commission</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 rounded-md bg-ivory-deep/60 p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 text-gold-deep">
              <Percent className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-ink">
                LuxeMarket takes{" "}
                <span className="font-semibold">{commissionPct}%</span> per sale — you keep{" "}
                <span className="font-semibold">{keepPct}%</span>.
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                Your rate is set by the marketplace. Contact support to discuss volume tiers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
