import {
  getAllPayments,
  getOrderById,
  getBatchResolvedPaymentIds,
  autoCancelExpiredOrders,
  getCancelledOrders,
} from "@/lib/repo";
import { getDashboardMetrics, getWeeklyComparison } from "@/lib/metrics";
import { formatRupees } from "@/lib/format";
import BatchResolveButton from "@/components/BatchResolveButton";
import Link from "next/link";
import BrandWordmark from "@/components/BrandWordmark";
import DashboardPaymentList from "@/components/DashboardPaymentList";
import NewOrderModal from "@/components/NewOrderModal";
import CreatePaymentLinkModal from "@/components/CreatePaymentLinkModal";
import MerchantSettingsModal from "@/components/MerchantSettingsModal";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic"; // always read fresh from Supabase, no caching

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex-1 min-w-[160px]">
      <div className="text-xs uppercase tracking-wide text-muted font-mono">{label}</div>
      <div className="font-display text-3xl sm:text-4xl font-bold mt-1 text-ink tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted font-body mt-0.5">{sub}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  // Lazy background check for order expiry on load
  await autoCancelExpiredOrders(7);

  const payments = await getAllPayments();
  const metrics = await getDashboardMetrics();
  const weeklyReport = await getWeeklyComparison();
  const cancelledOrders = await getCancelledOrders();
  const batchResolvedIds = await getBatchResolvedPaymentIds();

  // Pre-fetch resolved order details in parallel
  const resolvedOrderIds = Array.from(
    new Set(payments.map((p) => p.resolved_order_id).filter(Boolean) as string[])
  );
  const resolvedOrders = await Promise.all(resolvedOrderIds.map((id) => getOrderById(id)));
  const orderMap: Record<string, string> = {};
  for (const ord of resolvedOrders) {
    if (ord) orderMap[ord.id] = ord.product_name;
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* Top Header */}
      <header className="mb-10">
        <div className="flex items-center justify-between gap-4 mb-3">
          <Link href="/" className="inline-block hover:opacity-85 transition-opacity">
            <BrandWordmark size="md" />
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <CreatePaymentLinkModal />
            <NewOrderModal />
            <MerchantSettingsModal />
            <ThemeToggle />
          </div>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">
          Which order was each payment for?
        </h1>
        <Link
          href="/dashboard/metrics"
          className="text-xs text-muted font-mono hover:text-ink underline mt-2 inline-block"
        >
          See accuracy & test results →
        </Link>
      </header>

      {/* Summary Metric Stats */}
      <section className="flex flex-wrap gap-8 border-y border-line py-8 mb-10">
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

      {/* Interactive Payment Ledger */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="text-xs uppercase tracking-wide text-muted font-mono">Recent payments</div>
          <BatchResolveButton unresolvedCount={metrics.unresolvedCount} />
        </div>

        <DashboardPaymentList
          payments={payments}
          orderMap={orderMap}
          batchResolvedIds={Array.from(batchResolvedIds)}
          weeklyReport={weeklyReport}
          cancelledOrders={cancelledOrders}
        />
      </section>
    </main>
  );
}
