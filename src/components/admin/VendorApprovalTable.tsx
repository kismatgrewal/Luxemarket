"use client";

import { useState, useTransition } from "react";
import { Check, X, Ban, Store } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { timeAgo } from "@/lib/utils";

export interface PendingVendorRow {
  id: string;
  storeName: string;
  slug: string;
  tagline?: string | null;
  contactName?: string | null;
  contactEmail: string;
  createdAt: string | Date;
}

export interface VendorRow {
  id: string;
  storeName: string;
  slug: string;
  status: string;
  contactEmail: string;
  productCount: number;
  commissionBps: number;
  createdAt: string | Date;
}

export interface VendorApprovalTableProps {
  pending: PendingVendorRow[];
  vendors: VendorRow[];
  approveAction: (id: string) => Promise<void>;
  rejectAction: (id: string) => Promise<void>;
  suspendAction: (id: string) => Promise<void>;
}

function commissionPct(bps: number) {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

export function VendorApprovalTable({
  pending,
  vendors,
  approveAction,
  rejectAction,
  suspendAction,
}: VendorApprovalTableProps) {
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

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
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">Pending review ({pending.length})</TabsTrigger>
        <TabsTrigger value="all">All vendors ({vendors.length})</TabsTrigger>
      </TabsList>

      {/* Pending applications awaiting an approve / reject decision. */}
      <TabsContent value="pending">
        {pending.length === 0 ? (
          <EmptyState
            title="No applications in the queue"
            body="New vendor applications will appear here for review."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-ink/8 bg-white shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <p className="font-medium text-ink">{v.storeName}</p>
                      {v.tagline ? (
                        <p className="max-w-xs truncate text-xs text-ink-muted">{v.tagline}</p>
                      ) : (
                        <p className="text-xs text-ink-muted">/{v.slug}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-ink">{v.contactName ?? "—"}</p>
                      <p className="text-xs text-ink-muted">{v.contactEmail}</p>
                    </TableCell>
                    <TableCell className="text-ink-muted">{timeAgo(v.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy(v.id)}
                          onClick={() =>
                            run(
                              v.id,
                              rejectAction,
                              `Reject the application from ${v.storeName}?`,
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy(v.id)}
                          onClick={() => run(v.id, approveAction)}
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      {/* Directory of every vendor with lifecycle status + suspend control. */}
      <TabsContent value="all">
        {vendors.length === 0 ? (
          <EmptyState title="No vendors yet" body="Approved vendors will be listed here." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-ink/8 bg-white shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <p className="font-medium text-ink">{v.storeName}</p>
                      <p className="text-xs text-ink-muted">{v.contactEmail}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={v.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-ink">
                      {v.productCount}
                    </TableCell>
                    <TableCell className="tabular-nums text-ink">
                      {commissionPct(v.commissionBps)}
                    </TableCell>
                    <TableCell className="text-ink-muted">{timeAgo(v.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {v.status === "APPROVED" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            disabled={busy(v.id)}
                            onClick={() =>
                              run(v.id, suspendAction, `Suspend ${v.storeName}?`)
                            }
                          >
                            <Ban className="h-4 w-4" />
                            Suspend
                          </Button>
                        ) : v.status === "PENDING" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy(v.id)}
                            onClick={() => run(v.id, approveAction)}
                          >
                            <Check className="h-4 w-4" />
                            Approve
                          </Button>
                        ) : (
                          <span className="text-sm text-ink-muted">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-ink/12 bg-white/50 py-16 text-center">
      <Store className="mx-auto h-8 w-8 text-ink-muted/60" strokeWidth={1.5} />
      <p className="mt-3 font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-muted">{body}</p>
    </div>
  );
}
