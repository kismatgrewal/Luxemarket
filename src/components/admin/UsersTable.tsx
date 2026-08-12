"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { timeAgo } from "@/lib/utils";

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image?: string | null;
  /** For vendor accounts, their store's lifecycle status. */
  vendorStatus?: string | null;
  orderCount?: number;
  createdAt: string | Date;
}

const ROLE_VARIANT: Record<string, "neutral" | "gold" | "warning"> = {
  CUSTOMER: "neutral",
  VENDOR: "gold",
  ADMIN: "warning",
};

function RoleBadge({ role }: { role: string }) {
  // ADMIN gets the strongest treatment — inverted ink chip.
  if (role === "ADMIN") {
    return <Badge className="bg-ink text-ivory">Admin</Badge>;
  }
  const label = role.charAt(0) + role.slice(1).toLowerCase();
  return <Badge variant={ROLE_VARIANT[role] ?? "neutral"}>{label}</Badge>;
}

export function UsersTable({ users }: { users: AdminUserRow[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const matchesRole = role === "ALL" || u.role === role;
      const matchesQuery =
        q === "" ||
        (u.name?.toLowerCase().includes(q) ?? false) ||
        u.email.toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [users, query, role]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or store…"
            className="pl-10"
            aria-label="Search users"
          />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="sm:w-48" aria-label="Filter by role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            <SelectItem value="CUSTOMER">Customers</SelectItem>
            <SelectItem value="VENDOR">Vendors</SelectItem>
            <SelectItem value="ADMIN">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-ink/8 bg-white shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-14 text-center text-ink-muted">
                  {users.length === 0
                    ? "No users found."
                    : "No users match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar src={u.image} name={u.name ?? u.email} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{u.name ?? "—"}</p>
                        <p className="truncate text-xs text-ink-muted">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={u.role} />
                      {u.role === "VENDOR" && u.vendorStatus ? (
                        <StatusBadge status={u.vendorStatus} />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-ink">
                    {u.orderCount ?? 0}
                  </TableCell>
                  <TableCell className="text-ink-muted">{timeAgo(u.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-ink-muted">
        Showing {filtered.length} of {users.length} {users.length === 1 ? "user" : "users"}.
      </p>
    </div>
  );
}
