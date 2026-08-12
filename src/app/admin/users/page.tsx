import { listUsers } from "@/server/services/admin";
import { UsersTable, type AdminUserRow } from "@/components/admin/UsersTable";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await listUsers();

  const rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    vendorStatus: u.vendorStatus,
    orderCount: u.orderCount,
    createdAt: u.createdAt,
  }));

  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      <header>
        <p className="eyebrow">Users</p>
        <h1 className="display mt-1 text-3xl">People &amp; access</h1>
        <p className="mt-1 text-ink-muted">
          Everyone with an account — customers, vendors, and administrators.
        </p>
      </header>

      <UsersTable users={rows} />
    </div>
  );
}
