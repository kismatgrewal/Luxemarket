import { prisma } from "@/lib/prisma";
import { AuditLogTable, type AuditEntryRow } from "@/components/admin/AuditLogTable";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  // The RBAC audit trail: the most recent privileged actions across the console.
  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true, email: true } } },
  });

  const rows: AuditEntryRow[] = logs.map((log) => ({
    id: log.id,
    actorName: log.actor?.name ?? null,
    actorEmail: log.actor?.email ?? null,
    action: log.action,
    target: log.target,
    ip: log.ip,
    createdAt: log.createdAt,
  }));

  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      <header>
        <p className="eyebrow">Audit</p>
        <h1 className="display mt-1 text-3xl">Audit log</h1>
        <p className="mt-1 text-ink-muted">
          An immutable trail of privileged actions — who did what, to which record, and when.
        </p>
      </header>

      <AuditLogTable logs={rows} />
    </div>
  );
}
