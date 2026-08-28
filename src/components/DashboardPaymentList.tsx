"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatRupees, statusColor, statusLabel } from "@/lib/format";
import { Payment, Order, WeeklyComparison } from "@/lib/types";
import CsvExportButton from "./CsvExportButton";

interface DashboardPaymentListProps {
  payments: Payment[];
  orderMap: Record<string, string>;
  batchResolvedIds: string[];
  weeklyReport?: WeeklyComparison;
  cancelledOrders?: Order[];
}

type FilterStatus = "all" | "manual_review" | "ambiguous" | "resolved" | "batch" | "cancelled";

export default function DashboardPaymentList({
  payments,
  orderMap,
  batchResolvedIds,
  weeklyReport,
  cancelledOrders = [],
}: DashboardPaymentListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const batchSet = useMemo(() => new Set(batchResolvedIds), [batchResolvedIds]);

  const counts = useMemo(() => {
    return {
      all: payments.length,
      manual_review: payments.filter((p) => p.status === "manual_review").length,
      ambiguous: payments.filter((p) => p.status === "ambiguous" || p.status === "unresolved").length,
      resolved: payments.filter((p) => p.status === "resolved").length,
      batch: payments.filter((p) => batchSet.has(p.id)).length,
      cancelled: cancelledOrders.length,
    };
  }, [payments, batchSet, cancelledOrders]);

  const filteredPayments = useMemo(() => {
    const q = search.toLowerCase().trim();

    return payments.filter((p) => {
      // 1. Status Filter
      if (statusFilter === "manual_review" && p.status !== "manual_review") return false;
      if (statusFilter === "ambiguous" && p.status !== "ambiguous" && p.status !== "unresolved") return false;
      if (statusFilter === "resolved" && p.status !== "resolved") return false;
      if (statusFilter === "batch" && !batchSet.has(p.id)) return false;
      if (statusFilter === "cancelled") return false; // handled separately

      // 2. Text Search
      if (!q) return true;

      const productName = p.resolved_order_id ? orderMap[p.resolved_order_id] || "" : "";
      const rupeesStr = (p.amount / 100).toString();
      const formattedRupees = formatRupees(p.amount).toLowerCase();

      return (
        p.id.toLowerCase().includes(q) ||
        (p.razorpay_payment_id && p.razorpay_payment_id.toLowerCase().includes(q)) ||
        productName.toLowerCase().includes(q) ||
        rupeesStr.includes(q) ||
        formattedRupees.includes(q)
      );
    });
  }, [payments, search, statusFilter, batchSet, orderMap]);

  const filteredCancelledOrders = useMemo(() => {
    if (statusFilter !== "cancelled") return [];
    const q = search.toLowerCase().trim();
    if (!q) return cancelledOrders;
    return cancelledOrders.filter(
      (o) =>
        o.product_name.toLowerCase().includes(q) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        (o.amount / 100).toString().includes(q)
    );
  }, [cancelledOrders, statusFilter, search]);

  const exportRows = useMemo(() => {
    return filteredPayments.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      confidence: p.confidence,
      productName: p.resolved_order_id ? orderMap[p.resolved_order_id] : undefined,
      isBatchResolved: batchSet.has(p.id),
      received_at: p.received_at,
      resolved_at: p.resolved_at,
    }));
  }, [filteredPayments, orderMap, batchSet]);

  return (
    <div className="space-y-4 font-body">
      {/* Weekly Performance Report Callout Banner (Feature 8) */}
      {weeklyReport && (
        <div className="p-4 rounded-lg border border-line bg-paper/60 flex flex-wrap items-center justify-between gap-3 text-xs font-body animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-ink/5 flex items-center justify-center text-ink shrink-0">
              <svg className="w-3.5 h-3.5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-ink block sm:inline mr-2">
                Trailing 7-Day Performance:
              </span>
              <span className="text-muted leading-relaxed">
                {weeklyReport.summaryText}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
            <span className="px-2 py-1 rounded bg-paper border border-line text-muted">
              Last week: <strong className="text-ink">{weeklyReport.lastWeekAmbiguousPct}%</strong> ambiguous
            </span>
            <span className="px-2 py-1 rounded bg-paper border border-line text-muted">
              This week: <strong className="text-ink">{weeklyReport.currentWeekAmbiguousPct}%</strong> ambiguous
            </span>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px] max-w-sm">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payments by amount, order, or ID..."
            className="w-full text-xs font-body px-3 py-2 bg-paper border border-line rounded text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <CsvExportButton payments={exportRows} />
        </div>
      </div>

      {/* Filter Status Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`px-2.5 py-1 rounded transition-colors cursor-pointer border ${
            statusFilter === "all"
              ? "bg-ink text-paper font-semibold border-ink"
              : "bg-paper border-line text-muted hover:text-ink hover:border-ink"
          }`}
        >
          All ({counts.all})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("ambiguous")}
          className={`px-2.5 py-1 rounded transition-colors cursor-pointer border ${
            statusFilter === "ambiguous"
              ? "bg-amber/15 text-amber font-bold border-amber/40"
              : "bg-paper border-line text-muted hover:text-ink hover:border-ink"
          }`}
        >
          Ambiguous ({counts.ambiguous})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("resolved")}
          className={`px-2.5 py-1 rounded transition-colors cursor-pointer border ${
            statusFilter === "resolved"
              ? "bg-green/15 text-green font-bold border-green/40"
              : "bg-paper border-line text-muted hover:text-ink hover:border-ink"
          }`}
        >
          Matched ({counts.resolved})
        </button>

        {counts.batch > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter("batch")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer border ${
              statusFilter === "batch"
                ? "bg-green/15 text-green font-bold border-green/40"
                : "bg-paper border-line text-muted hover:text-ink hover:border-ink"
            }`}
          >
            Resolved Together ({counts.batch})
          </button>
        )}

        {counts.manual_review > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter("manual_review")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer border ${
              statusFilter === "manual_review"
                ? "bg-red/15 text-red font-bold border-red/40"
                : "bg-paper border-line text-muted hover:text-ink hover:border-ink"
            }`}
          >
            Needs Review ({counts.manual_review})
          </button>
        )}

        {/* Feature 4: Cancelled Orders Tab */}
        <button
          type="button"
          onClick={() => setStatusFilter("cancelled")}
          className={`px-2.5 py-1 rounded transition-colors cursor-pointer border ${
            statusFilter === "cancelled"
              ? "bg-ink text-paper font-semibold border-ink"
              : "bg-paper border-line text-muted hover:text-ink hover:border-ink"
          }`}
        >
          Cancelled ({counts.cancelled})
        </button>
      </div>

      {/* Cancelled Orders List View */}
      {statusFilter === "cancelled" ? (
        <div className="divide-y divide-line border border-line rounded-md overflow-hidden bg-white">
          {filteredCancelledOrders.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted">
              No cancelled or stale expired orders found.
            </div>
          ) : (
            filteredCancelledOrders.map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between gap-4 text-xs font-body hover:bg-paper/40 transition-colors">
                <div>
                  <div className="font-semibold text-ink flex items-center gap-2">
                    <span>{order.product_name}</span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-muted/10 text-muted border border-line">
                      Cancelled (Stale Expiry)
                    </span>
                  </div>
                  <div className="text-muted text-[11px] font-mono mt-1">
                    Order created {new Date(order.created_at).toLocaleDateString("en-IN")} · Customer: {order.customer_name || "Unassigned"}
                  </div>
                </div>
                <div className="font-mono font-bold text-sm text-ink shrink-0">
                  {formatRupees(order.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Payment Rows List */
        <div className="divide-y divide-line border border-line rounded-md overflow-hidden bg-white">
          {filteredPayments.length === 0 && (
            <div className="p-10 text-center text-sm font-body">
              {payments.length === 0 ? (
                <div className="max-w-md mx-auto space-y-3">
                  <div className="font-display font-bold text-base text-ink">No payments in ledger yet</div>
                  <p className="text-xs text-muted leading-relaxed">
                    Kisne Bheja is listening for incoming Razorpay webhooks. Generate a payment link using &ldquo;Test Payment (Razorpay)&rdquo; above and complete payment in Razorpay test mode to trigger the reconciliation pipeline.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-muted">No transactions match your search or filter.</div>
                  {(search || statusFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setStatusFilter("all");
                      }}
                      className="mt-2 text-xs font-mono text-ink underline cursor-pointer"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {filteredPayments.map((p) => {
            const productName = p.resolved_order_id ? orderMap[p.resolved_order_id] : undefined;
            const confidencePct = Math.round(p.confidence * 100);
            const isBatchResolved = batchSet.has(p.id);
            const isManualReview = p.status === "manual_review";
            const isResolved = p.status === "resolved";

            // Strict 3-color mapping: green for resolved, red for manual_review, amber for ambiguous
            const colorToken = isResolved
              ? "var(--green)"
              : isManualReview
              ? "var(--red)"
              : "var(--amber)";

            const badgeBg = isResolved
              ? "bg-green/10 text-green border-green/20"
              : isManualReview
              ? "bg-red/10 text-red border-red/20"
              : "bg-amber/10 text-amber border-amber/20";

            return (
              <Link
                key={p.id}
                href={`/dashboard/${p.id}`}
                className="flex items-center gap-4 px-5 py-4 payment-row-hover transition-colors"
              >
                <div className="shrink-0 space-y-1">
                  <div className="font-mono text-sm w-28 font-medium text-ink">
                    {formatRupees(p.amount)}
                  </div>
                  {/* Feature 6: Payment method badge */}
                  <div className="text-[10px] font-mono text-muted uppercase">
                    {p.payer_card_last4
                      ? `Card ···· ${p.payer_card_last4}`
                      : p.payment_method || "UPI"}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Confidence Bar: Always strictly Green, Amber, or Red */}
                  <div className="h-1.5 rounded-full bg-line overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: isManualReview ? "100%" : `${confidencePct}%`,
                        backgroundColor: colorToken,
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted font-mono mt-1 flex flex-wrap items-center gap-x-2">
                    <span>
                      {isManualReview ? "0% sure" : `${confidencePct}% sure`}
                      {productName ? ` · ${productName}` : ""}
                    </span>
                    {isResolved && (
                      <span className="text-green font-body font-medium text-[11px] flex items-center gap-1">
                        <svg className="w-3 h-3 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Confirmed to customer</span>
                      </span>
                    )}
                  </div>
                  {isBatchResolved && (
                    <div className="text-xs text-green font-body font-medium mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green inline-block shrink-0" />
                      <span>Resolved together with another payment of the same amount</span>
                    </div>
                  )}
                </div>

                {/* Status Badge & Velocity Spike Flag */}
                <div className="shrink-0 flex items-center gap-2">
                  {/* Feature 5: Payment velocity anomaly flag */}
                  {(p.is_velocity_spike || (p.velocity_count && p.velocity_count >= 3)) && (
                    <span
                      className="text-[11px] font-mono font-medium px-2 py-0.5 rounded border border-amber/30 bg-amber/10 text-amber flex items-center gap-1.5"
                      title="Unusual volume of same amount payments in short window"
                    >
                      <svg className="w-3 h-3 text-amber" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                      <span>Volume Spike</span>
                    </span>
                  )}
                  <div
                    className={`text-xs font-body px-2.5 py-1 rounded font-medium border ${badgeBg}`}
                  >
                    {isBatchResolved
                      ? "Resolved together"
                      : statusLabel(p.status)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
