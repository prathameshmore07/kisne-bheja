import Link from "next/link";
import { formatRupees } from "@/lib/format";
import BrandWordmark from "@/components/BrandWordmark";
import ThemeToggle from "@/components/ThemeToggle";
import { getEngineTelemetry } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export default async function BenchmarkMetricsPage() {
  const liveTelemetry = await getEngineTelemetry();

  const total = liveTelemetry.totalCount;
  const resolvedPct = total > 0 ? Math.round((liveTelemetry.resolvedCount / total) * 100) : 0;
  const ambiguousPct = total > 0 ? Math.round((liveTelemetry.ambiguousCount / total) * 100) : 0;
  const manualReviewPct = total > 0 ? Math.round((liveTelemetry.manualReviewCount / total) * 100) : 0;

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* Top Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-xs font-mono text-muted hover:text-ink transition-colors inline-flex items-center gap-1.5"
        >
          <span>←</span> <span>Back to ledger</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/" className="inline-block hover:opacity-85 transition-opacity">
            <BrandWordmark size="sm" />
          </Link>
        </div>
      </div>

      {/* Page Header */}
      <header className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-widest text-muted font-medium">
            Live Ledger Metrics
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">
          Payment Reconciliation Metrics
        </h1>
        <p className="text-sm text-muted font-body mt-2 max-w-2xl leading-relaxed">
          Real-time reconciliation statistics and multi-signal evidence distributions computed directly from your active Supabase ledger.
        </p>
      </header>

      {/* Real Live Stats Row */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-6 border-y border-line mb-10 bg-paper/50 px-5 rounded-lg border">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted font-mono font-medium">Total Payments</div>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-ink mt-1 tabular-nums">
            {total}
          </div>
          <div className="text-[11px] text-muted font-mono mt-0.5">Recorded in ledger</div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted font-mono font-medium">Resolved</div>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-green mt-1 tabular-nums">
            {resolvedPct}%
          </div>
          <div className="text-[11px] text-muted font-mono mt-0.5">{liveTelemetry.resolvedCount} of {total} confirmed</div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted font-mono font-medium">Needs Confirmation</div>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-amber mt-1 tabular-nums">
            {ambiguousPct}%
          </div>
          <div className="text-[11px] text-muted font-mono mt-0.5">{liveTelemetry.ambiguousCount} awaiting check</div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted font-mono font-medium">Held for Review</div>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-red mt-1 tabular-nums">
            {manualReviewPct}%
          </div>
          <div className="text-[11px] text-muted font-mono mt-0.5">{liveTelemetry.manualReviewCount} zero-guessing</div>
        </div>
      </section>

      {/* Live Store Volume Summary */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted font-semibold">
            Store Revenue & Volume
          </h2>
          <span className="text-[11px] font-mono text-muted">
            {liveTelemetry.totalCount} transactions tracked
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-white border border-line rounded-lg font-mono">
          <div>
            <div className="text-[10px] uppercase text-muted">Total Volume</div>
            <div className="text-lg font-bold text-ink mt-0.5 tabular-nums">
              {formatRupees(liveTelemetry.totalVolumePaise)}
            </div>
            <div className="text-[10px] text-muted">{liveTelemetry.totalCount} payments total</div>
          </div>

          <div>
            <div className="text-[10px] uppercase text-muted">Resolved Volume</div>
            <div className="text-lg font-bold text-green mt-0.5 tabular-nums">
              {formatRupees(liveTelemetry.resolvedVolumePaise)}
            </div>
            <div className="text-[10px] text-muted">{liveTelemetry.resolvedCount} orders matched</div>
          </div>

          <div>
            <div className="text-[10px] uppercase text-muted">Unresolved Volume</div>
            <div className="text-lg font-bold text-amber mt-0.5 tabular-nums">
              {formatRupees(liveTelemetry.unresolvedVolumePaise)}
            </div>
            <div className="text-[10px] text-muted">pending confirmation</div>
          </div>

          <div>
            <div className="text-[10px] uppercase text-muted">Signals Evaluated</div>
            <div className="text-lg font-bold text-ink mt-0.5 tabular-nums">
              {liveTelemetry.totalSignalsComputed}
            </div>
            <div className="text-[10px] text-muted">evidence entries</div>
          </div>
        </div>
      </section>

      {/* How Multi-Signal Scorer Checks Each Payment */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted font-semibold">
            Signal Engine Weight Matrix
          </h2>
          <span className="text-[11px] font-mono text-muted">Additive Bayesian Evidence Model</span>
        </div>

        <div className="border border-line rounded-lg overflow-hidden bg-white">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-paper text-muted text-[11px] border-b border-line uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Signal Type</th>
                <th className="py-3 px-4">Weight Impact</th>
                <th className="py-3 px-4">Engine Logic</th>
                <th className="py-3 px-4 text-right">Computed In DB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr>
                <td className="py-3 px-4 font-semibold text-ink">Amount Match</td>
                <td className="py-3 px-4 text-green">+40% to +85%</td>
                <td className="py-3 px-4 text-muted font-body text-xs">
                  Exact amount match against pending orders in the active ledger
                </td>
                <td className="py-3 px-4 text-right tabular-nums font-semibold">
                  {liveTelemetry.signalCounts.amount_match || 0}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-ink">Timing Proximity</td>
                <td className="py-3 px-4 text-green">+2% to +28%</td>
                <td className="py-3 px-4 text-muted font-body text-xs">
                  Exponential decay curve based on time elapsed since order creation
                </td>
                <td className="py-3 px-4 text-right tabular-nums font-semibold">
                  {liveTelemetry.signalCounts.timing || 0}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-ink">Payer &amp; Card History</td>
                <td className="py-3 px-4 text-green">+35% / -20%</td>
                <td className="py-3 px-4 text-muted font-body text-xs">
                  Payer VPA hash or Card Last-4 + Network proxy match against customer record
                </td>
                <td className="py-3 px-4 text-right tabular-nums font-semibold">
                  {liveTelemetry.signalCounts.payer_history || 0}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-ink">Customer Confirmation</td>
                <td className="py-3 px-4 text-green">+40% to +45%</td>
                <td className="py-3 px-4 text-muted font-body text-xs">
                  Natural language or keyword confirmation interpreted from customer chat
                </td>
                <td className="py-3 px-4 text-right tabular-nums font-semibold">
                  {liveTelemetry.signalCounts.conversation || 0}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-ink">Batch Assignment</td>
                <td className="py-3 px-4 text-green">+35%</td>
                <td className="py-3 px-4 text-muted font-body text-xs">
                  Two colliding payments resolved jointly via bijective match
                </td>
                <td className="py-3 px-4 text-right tabular-nums font-semibold">
                  {liveTelemetry.signalCounts.batch_assignment || 0}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-ink">Negative Signal / Exclusion</td>
                <td className="py-3 px-4 text-red">-100%</td>
                <td className="py-3 px-4 text-muted font-body text-xs">
                  Alternative order confirmed or payment unlinked by merchant
                </td>
                <td className="py-3 px-4 text-right tabular-nums font-semibold">
                  {liveTelemetry.signalCounts.negative || 0}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Multi-Currency & Gateway Compatibility */}
      <section className="mb-16">
        <div className="mb-4">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted font-semibold">
            Gateway &amp; Rails Compatibility
          </h2>
          <p className="text-xs text-muted font-body mt-1">
            Built for UPI with seamless support for card networks and bank transfers.
          </p>
        </div>

        <div className="border border-line rounded-lg p-6 bg-white space-y-4">
          <p className="leading-relaxed text-ink text-xs font-body max-w-2xl">
            Kisne Bheja is optimized for Indian UPI (₹) and webhooks from Razorpay, PayU, Cashfree, and Stripe, handling payments that arrive without order metadata:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-paper border border-line flex flex-col justify-between">
              <div className="font-semibold text-ink text-xs font-mono mb-1.5">
                UPI &amp; QR Transfers
              </div>
              <p className="text-muted text-xs font-body leading-relaxed">
                Direct VPA payments from GPay, PhonePe, and Paytm without checkout links.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-paper border border-line flex flex-col justify-between">
              <div className="font-semibold text-ink text-xs font-mono mb-1.5">
                Debit &amp; Credit Cards
              </div>
              <p className="text-muted text-xs font-body leading-relaxed">
                Last-4 digits + Card Network identity proxy matching when VPA is absent.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-paper border border-line flex flex-col justify-between">
              <div className="font-semibold text-ink text-xs font-mono mb-1.5">
                Global Rails
              </div>
              <p className="text-muted text-xs font-body leading-relaxed">
                Compatible with Pix, PayNow, Zelle, and Faster Payments multi-order pooling.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
