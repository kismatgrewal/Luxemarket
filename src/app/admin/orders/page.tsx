import { listAllOrders } from "@/server/services/admin";
import { OrdersTable, type AdminOrderRow } from "@/components/admin/OrdersTable";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await listAllOrders();

  const rows: AdminOrderRow[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    // A single order can span multiple vendors — the service surfaces that fan-out.
    vendorCount: o.vendorCount,
    itemCount: o.itemCount,
    totalCents: o.totalCents,
    currency: o.currency,
    createdAt: o.placedAt,
  }));

  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      <header>
        <p className="eyebrow">Orders</p>
        <h1 className="display mt-1 text-3xl">All orders</h1>
        <p className="mt-1 text-ink-muted">
          Every order across the marketplace, with its lifecycle status and vendor fan-out.
        </p>
      </header>

      <OrdersTable orders={rows} />
    </div>
  );
}
