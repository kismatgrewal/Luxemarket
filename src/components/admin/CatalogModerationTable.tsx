"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Flag, Archive, Sparkles, Pencil, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatMoney, timeAgo } from "@/lib/utils";

export interface AdminProductRow {
  id: string;
  title: string;
  slug: string;
  vendorName: string;
  categoryName: string | null;
  status: string;
  priceCents: number;
  currency: string;
  inventory: number;
  aiGenerated: boolean;
  createdAt: string | Date;
}

export interface CatalogModerationTableProps {
  products: AdminProductRow[];
  flagAction: (id: string) => Promise<void>;
  archiveAction: (id: string) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}

const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"];

export function CatalogModerationTable({
  products,
  flagAction,
  archiveAction,
  deleteAction,
}: CatalogModerationTableProps) {
  const [status, setStatus] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (status === "ALL" ? products : products.filter((p) => p.status === status)),
    [products, status],
  );

  function run(id: string, action: (id: string) => Promise<void>, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusyId(id);
    startTransition(async () => {
      await action(id);
      setBusyId(null);
    });
  }

  const busy = (id: string) => isPending && busyId === id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-52" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {PRODUCT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-ink-muted">
          {filtered.length} of {products.length} {products.length === 1 ? "product" : "products"}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-ink/8 bg-white shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Moderation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-14 text-center text-ink-muted">
                  {products.length === 0
                    ? "No products in the catalog yet."
                    : "No products with this status."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{p.title}</p>
                        <p className="truncate text-xs text-ink-muted">
                          {p.categoryName ?? "Uncategorized"} · added {timeAgo(p.createdAt)}
                        </p>
                      </div>
                      {p.aiGenerated ? (
                        <Badge variant="gold" className="shrink-0">
                          <Sparkles className="h-3 w-3" />
                          AI
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-ink">{p.vendorName}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-ink">
                    {formatMoney(p.priceCents, p.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={p.inventory === 0 ? "text-destructive" : "text-ink-muted"}>
                      {p.inventory}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/catalog/${p.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy(p.id)}
                        onClick={() =>
                          run(p.id, flagAction, `Flag "${p.title}" for review?`)
                        }
                      >
                        <Flag className="h-4 w-4" />
                        Flag
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy(p.id) || p.status === "ARCHIVED"}
                        onClick={() =>
                          run(p.id, archiveAction, `Archive "${p.title}"? It will leave the storefront.`)
                        }
                      >
                        <Archive className="h-4 w-4" />
                        Archive
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={busy(p.id)}
                        onClick={() =>
                          run(
                            p.id,
                            deleteAction,
                            `Delete "${p.title}" permanently? Orders keep their item records, but the listing and images are removed.`,
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
