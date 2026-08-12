"use client";

import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatMoney, timeAgo } from "@/lib/utils";

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string | null;
  customerEmail: string;
  vendorCount: number;
  itemCount: number;
  totalCents: number;
  currency: string;
  createdAt: string | Date;
}

const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "FULFILLED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

export function OrdersTable({ orders }: { orders: AdminOrderRow[] }) {
  const [status, setStatus] = useState<string>("ALL");

  const filtered = useMemo(
    () => (status === "ALL" ? orders : orders.filter((o) => o.status === status)),
    [orders, status],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-52" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-ink-muted">
          {filtered.length} of {orders.length} {orders.length === 1 ? "order" : "orders"}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-ink/8 bg-white shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Vendors</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Placed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-14 text-center text-ink-muted">
                  {orders.length === 0
                    ? "No orders have been placed yet."
                    : "No orders with this status."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs font-medium text-ink">
                    {o.orderNumber}
                  </TableCell>
                  <TableCell>
                    <p className="text-ink">{o.customerName ?? "—"}</p>
                    <p className="text-xs text-ink-muted">{o.customerEmail}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-ink">
                    {o.vendorCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-ink-muted">
                    {o.itemCount}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-ink">
                    {formatMoney(o.totalCents, o.currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-right text-ink-muted">
                    {timeAgo(o.createdAt)}
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
