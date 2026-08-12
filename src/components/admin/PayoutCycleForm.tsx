"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startPayoutCycle } from "@/server/actions/checkout";

/**
 * Admin settlement tool: pick a window and sweep every approved vendor's
 * accrued balance into PENDING payout records. Shows the sweep summary inline
 * and refreshes the page so the payouts table reflects the new records.
 */
export function PayoutCycleForm() {
  const router = useRouter();
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ vendorCount: number; totalCents: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await startPayoutCycle({
        periodStart: new Date(`${periodStart}T00:00:00Z`),
        periodEnd: new Date(`${periodEnd}T23:59:59Z`),
      });
      if (res.vendorCount === 0) {
        setError("No vendor balances to sweep — every approved vendor has a zero balance.");
      } else {
        setResult({ vendorCount: res.vendorCount, totalCents: res.totalCents });
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't run the payout cycle.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-xs font-medium text-ink">Period start</span>
          <Input
            type="date"
            required
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-medium text-ink">Period end</span>
          <Input
            type="date"
            required
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </label>
      </div>

      {result && (
        <p className="rounded-md bg-emerald/10 px-4 py-3 text-sm text-emerald">
          Settled {result.vendorCount} {result.vendorCount === 1 ? "vendor" : "vendors"} for a total
          of ${(result.totalCents / 100).toFixed(2)} across {result.vendorCount} payout{" "}
          {result.vendorCount === 1 ? "record" : "records"}.
        </p>
      )}
      {error && <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {pending ? "Sweeping balances…" : "Run payout cycle"}
      </Button>
    </form>
  );
}
