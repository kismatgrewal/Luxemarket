import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import type { ProductStatus } from "@prisma/client";
import { ImageOff, Package, Plus, Search, Sparkles } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatMoney } from "@/lib/utils";
import { listVendorProducts } from "@/server/services/vendors";
import { requireVendor } from "../_data";

export const metadata: Metadata = { title: "Products" };

const LOW_STOCK_THRESHOLD = 5;

const STATUS_BADGE: Record<ProductStatus, { label: string; variant: BadgeProps["variant"] }> = {
  DRAFT: { label: "Draft", variant: "neutral" },
  ACTIVE: { label: "Active", variant: "success" },
  ARCHIVED: { label: "Archived", variant: "outline" },
};

const FILTERS: { key: string; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "DRAFT", label: "Draft" },
  { key: "ARCHIVED", label: "Archived" },
];

function buildHref(status: string, q: string) {
  const params = new URLSearchParams();
  if (status && status !== "ALL") params.set("status", status);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/vendor/products?${qs}` : "/vendor/products";
}

export default async function VendorProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const vendor = await requireVendor();
  const all = await listVendorProducts(vendor.id);

  const activeStatus = (searchParams.status ?? "ALL").toUpperCase();
  const q = (searchParams.q ?? "").trim();
  const needle = q.toLowerCase();

  const rows = (all ?? []).filter((p) => {
    if (activeStatus !== "ALL" && p.status !== activeStatus) return false;
    if (needle && !`${p.title} ${p.sku}`.toLowerCase().includes(needle)) return false;
    return true;
  });

  const hasProducts = (all ?? []).length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight text-ink">Products</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {hasProducts
              ? `${all.length} ${all.length === 1 ? "product" : "products"} in your store`
              : "Build out your catalog"}
          </p>
        </div>
        <Button asChild variant="gold">
          <Link href="/vendor/products/new">
            <Plus className="h-4 w-4" />
            Add product
          </Link>
        </Button>
      </div>

      {!hasProducts ? (
        <Card className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ivory-deep text-ink-muted">
            <Package className="h-7 w-7" />
          </span>
          <h2 className="font-serif text-xl text-ink">No products yet</h2>
          <p className="max-w-sm text-sm text-ink-muted">
            List your first item to start selling. You can save it as a draft and publish when
            you&apos;re ready.
          </p>
          <Button asChild variant="primary" className="mt-2">
            <Link href="/vendor/products/new">
              <Plus className="h-4 w-4" />
              Add your first product
            </Link>
          </Button>
        </Card>
      ) : (
        <>
          {/* Toolbar: status filter + search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 rounded-md bg-ivory-deep p-1">
              {FILTERS.map((f) => {
                const active = activeStatus === f.key;
                return (
                  <Link
                    key={f.key}
                    href={buildHref(f.key, q)}
                    className={cn(
                      "rounded px-3.5 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-white text-ink shadow-sm"
                        : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </div>

            <form action="/vendor/products" className="relative w-full sm:w-72">
              {activeStatus !== "ALL" ? (
                <input type="hidden" name="status" value={activeStatus} />
              ) : null}
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search title or SKU"
                className="pl-9"
              />
            </form>
          </div>

          <Card className="overflow-hidden">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <p className="font-serif text-lg text-ink">No matching products</p>
                <p className="text-sm text-ink-muted">
                  Try a different search or filter.
                </p>
                <Button asChild variant="ghost" size="sm" className="mt-1">
                  <Link href="/vendor/products">Clear filters</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Inventory</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => {
                    const badge = STATUS_BADGE[p.status];
                    const low = p.inventory <= LOW_STOCK_THRESHOLD;
                    const onSale =
                      typeof p.compareAtCents === "number" && p.compareAtCents > p.priceCents;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-ivory-deep">
                              {p.imageUrl ? (
                                <Image
                                  src={p.imageUrl}
                                  alt={p.title}
                                  fill
                                  sizes="44px"
                                  className="object-cover"
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-ink-muted">
                                  <ImageOff className="h-4 w-4" />
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate font-medium text-ink">{p.title}</p>
                                {p.aiGenerated ? (
                                  <span
                                    title="Description drafted with AI"
                                    className="text-gold-deep"
                                  >
                                    <Sparkles className="h-3.5 w-3.5" />
                                  </span>
                                ) : null}
                              </div>
                              {p.category?.name ? (
                                <p className="truncate text-xs text-ink-muted">
                                  {p.category.name}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-ink-muted">{p.sku}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className="font-medium text-ink">
                            {formatMoney(p.priceCents, p.currency)}
                          </span>
                          {onSale ? (
                            <span className="ml-1.5 text-xs text-ink-muted line-through">
                              {formatMoney(p.compareAtCents!, p.currency)}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={cn(low && "text-destructive")}>{p.inventory}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <Link
                            href={`/vendor/products/${p.id}/edit`}
                            className="text-sm font-medium text-gold-deep hover:underline"
                          >
                            Edit
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
