import { getAllPayments, getOrderById } from "@/lib/repo";
import { getDashboardMetrics } from "@/lib/metrics";
import { formatRupees, statusColor, statusLabel } from "@/lib/format";
import BatchResolveButton from "@/components/BatchResolveButton";
import Link from "next/link";

export const dynamic = "force-dynamic"; // always read fresh from SQLite, no caching

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex-1 min-w-[160px]">
      <div className="text-xs uppercase tracking-wide text-muted font-body">{label}</div>
      <div className="font-display text-3xl mt-1 text-ink">{value}</div>
      {sub && <div className="text-xs text-muted font-body mt-0.5">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const payments = getAllPayments();
  const metrics = getDashboardMetrics();

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-widest text-muted font-mono mb-1">Kisne Bheja</div>
        <h1 className="font-display text-2xl font-bold text-ink">Which order was each payment for?</h1>
        <Link href="/dashboard/metrics" className="text-xs text-muted font-mono hover:underline mt-1 inline-block">
          view how well it worked →
        </Link>
      </header>

      <section className="flex flex-wrap gap-8 border-y border-line py-6 mb-8">
        <StatCell
          label="Payments to check"
          value={formatRupees(metrics.unresolvedValue)}
          sub={`${metrics.unresolvedCount} payment${metrics.unresolvedCount === 1 ? "" : "s"} waiting`}
        />
        <StatCell
          label="Matched so far"
          value={`${(metrics.resolutionRate * 100).toFixed(0)}%`}
          sub={`${metrics.resolvedCount} of ${metrics.totalCount} matched`}
        />
        <StatCell
          label="Average time to match"
          value={metrics.medianResolutionMinutes !== null ? `${metrics.medianResolutionMinutes.toFixed(1)} min` : "—"}
        />
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="text-xs uppercase tracking-wide text-muted font-mono">Recent payments</div>
          <BatchResolveButton unresolvedCount={metrics.unresolvedCount} />
        </div>
        <div className="divide-y divide-line border border-line rounded-md overflow-hidden bg-white">
          {payments.length === 0 && (
            <div className="p-6 text-sm text-muted font-body">No payments received yet. When a customer pays, it will appear here.</div>
          )}
          {payments.map((p) => {
            const order = p.resolved_order_id ? getOrderById(p.resolved_order_id) : undefined;
            const confidencePct = Math.round(p.confidence * 100);
            return (
              <Link
                key={p.id}
                href={`/dashboard/${p.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-paper hover:shadow-xs transition-all"
              >
                <div className="font-mono text-sm w-28 shrink-0 font-medium">{formatRupees(p.amount)}</div>

                <div className="flex-1 min-w-0">
                  <div className="h-1.5 rounded-full bg-line overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${confidencePct}%`, backgroundColor: statusColor(p.status) }}
                    />
                  </div>
                  <div className="text-xs text-muted font-mono mt-1">
                    {confidencePct}% sure{order ? ` · ${order.product_name}` : ""}
                  </div>
                </div>

                <div
                  className="text-xs font-body px-2.5 py-1 rounded shrink-0 font-medium"
                  style={{ color: statusColor(p.status), backgroundColor: `${statusColor(p.status)}1A` }}
                >
                  {statusLabel(p.status)}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
