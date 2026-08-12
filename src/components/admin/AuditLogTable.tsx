import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";

export interface AuditEntryRow {
  id: string;
  actorName: string | null;
  actorEmail?: string | null;
  action: string;
  target?: string | null;
  ip?: string | null;
  createdAt: string | Date;
}

/** Colour the action badge by verb so approvals and revocations stand apart. */
function actionVariant(action: string) {
  const a = action.toLowerCase();
  if (a.includes("approve")) return "success" as const;
  if (a.includes("suspend") || a.includes("reject") || a.includes("delete") || a.includes("flag"))
    return "danger" as const;
  return "neutral" as const;
}

export function AuditLogTable({ logs }: { logs: AuditEntryRow[] }) {
  if (!logs?.length) {
    return (
      <div className="rounded-lg border border-dashed border-ink/12 bg-white/50 py-16 text-center">
        <p className="text-sm text-ink-muted">No audit events recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ink/8 bg-white shadow-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target</TableHead>
            <TableHead className="text-right">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar name={log.actorName ?? "System"} className="h-8 w-8" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{log.actorName ?? "System"}</p>
                    {log.actorEmail ? (
                      <p className="truncate text-xs text-ink-muted">{log.actorEmail}</p>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
              </TableCell>
              <TableCell>
                {log.target ? (
                  <code className="rounded bg-ivory-deep px-1.5 py-0.5 font-mono text-xs text-ink-soft">
                    {log.target}
                  </code>
                ) : (
                  <span className="text-ink-muted">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <time
                  className="text-sm text-ink-muted"
                  dateTime={new Date(log.createdAt).toISOString()}
                  title={new Date(log.createdAt).toLocaleString()}
                >
                  {timeAgo(log.createdAt)}
                </time>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
