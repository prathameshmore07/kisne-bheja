import { getPaymentById, getOrderById } from "@/lib/repo";
import { getAllCandidateScores } from "@/lib/scorer";
import { getTimelineForPayment } from "@/lib/audit";
import { formatRupees, statusColor, statusLabel } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ paymentId: string }>;
}

export default async function PaymentDetailPage({ params }: PageProps) {
  const { paymentId } = await params;
  const payment = getPaymentById(paymentId);

  if (!payment) {
    notFound();
  }

  const resolvedOrder = payment.resolved_order_id ? getOrderById(payment.resolved_order_id) : undefined;
  const candidateScores = getAllCandidateScores(paymentId);
  const timeline = getTimelineForPayment(paymentId);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      {/* Header Navigation */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-xs font-mono text-muted hover:text-ink transition-colors inline-flex items-center gap-1.5"
        >
          <span>←</span> <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Payment Overview Card */}
      <section className="bg-white border border-line rounded-lg p-6 mb-8 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted font-mono mb-1">Payment Details</div>
            <h1 className="font-display text-3xl font-bold">{formatRupees(payment.amount)}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted font-mono mt-2">
              <span>ID: {payment.id.slice(0, 8)}...</span>
              {payment.razorpay_payment_id && <span>Razorpay: {payment.razorpay_payment_id}</span>}
              {payment.payer_vpa_hash && <span>VPA Hash: {payment.payer_vpa_hash}</span>}
              <span>Received: {new Date(payment.received_at).toLocaleTimeString("en-IN")}</span>
            </div>
          </div>

          <div
            className="text-xs font-body font-medium px-3 py-1.5 rounded"
            style={{ color: statusColor(payment.status), backgroundColor: `${statusColor(payment.status)}1A` }}
          >
            {statusLabel(payment.status)}
          </div>
        </div>

        {resolvedOrder && (
          <div className="mt-4 pt-4 border-t border-line flex items-center justify-between text-xs font-body">
            <span className="text-muted">Resolved to:</span>
            <span className="font-medium text-ink">
              {resolvedOrder.product_name} ({formatRupees(resolvedOrder.amount)}) · {resolvedOrder.customer_name ?? "Unknown customer"}
            </span>
          </div>
        )}
      </section>

      {/* Candidate Orders with Evidence Breakdown */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold">Candidate Orders & Evidence</h2>
          <span className="text-xs text-muted font-mono">{candidateScores.length} Candidate{candidateScores.length === 1 ? "" : "s"} Evaluated</span>
        </div>

        {candidateScores.length === 0 ? (
          <div className="bg-white border border-line rounded-lg p-6 text-sm text-muted font-body">
            No matching candidate orders recorded for this payment.
          </div>
        ) : (
          <div className="space-y-4">
            {candidateScores.map((cand, idx) => {
              const isTopCandidate = idx === 0;
              const isResolved = payment.resolved_order_id === cand.candidate_order_id;
              const pct = Math.round(cand.confidence * 100);
              const order = cand.order;

              const borderColor = isResolved
                ? "var(--green)"
                : isTopCandidate && cand.confidence >= 0.6
                ? statusColor(payment.status)
                : "var(--line)";

              return (
                <div
                  key={cand.candidate_order_id}
                  className="bg-white rounded-lg p-5 transition-shadow"
                  style={{
                    borderWidth: isResolved || (isTopCandidate && cand.confidence >= 0.6) ? "2px" : "1px",
                    borderColor: borderColor,
                  }}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-semibold text-base">
                          {order?.product_name ?? cand.candidate_order_id}
                        </h3>
                        {isResolved && (
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-green/10 text-green font-bold">
                            Linked
                          </span>
                        )}
                        {isTopCandidate && !isResolved && (
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber/10 text-amber font-bold">
                            Top Match
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted font-mono mt-0.5">
                        {order ? `${formatRupees(order.amount)} · ${order.customer_name ?? "No customer name"} (${order.customer_vpa_hash ?? "No VPA"})` : "Unknown order"}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-display font-bold text-xl">{pct}%</div>
                      <div className="text-[10px] text-muted font-mono uppercase tracking-wider">Confidence</div>
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="h-2 rounded-full bg-line overflow-hidden mb-4">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor:
                          pct >= 85
                            ? "var(--green)"
                            : pct >= 60
                            ? "var(--amber)"
                            : "var(--muted)",
                      }}
                    />
                  </div>

                  {/* Evidence Items */}
                  <div className="bg-paper rounded-md p-3">
                    <div className="text-[11px] uppercase tracking-wider font-mono text-muted mb-2 font-semibold">
                      Evidence Trail
                    </div>
                    {cand.evidence.length === 0 ? (
                      <div className="text-xs text-muted font-body">No signals recorded.</div>
                    ) : (
                      <div className="space-y-1.5 font-mono text-xs">
                        {cand.evidence.map((ev) => {
                          const isPositive = ev.signal_weight > 0;
                          return (
                            <div key={ev.id} className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] shrink-0 font-bold ${
                                    isPositive
                                      ? "bg-green/10 text-green"
                                      : "bg-red/10 text-red"
                                  }`}
                                >
                                  {isPositive ? "+" : ""}{Math.round(ev.signal_weight * 100)}%
                                </span>
                                <span className="font-medium text-ink uppercase text-[11px] shrink-0">
                                  {ev.signal_type.replace(/_/g, " ")}
                                </span>
                                <span className="text-muted truncate text-[11px]">
                                  — {ev.detail}
                                </span>
                              </div>
                              <span className="text-muted shrink-0 text-[11px]">
                                → {Math.round(ev.confidence_after * 100)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Unified Audit & Ledger Timeline */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold">Audit & Resolution Timeline</h2>
          <span className="text-xs text-muted font-mono">{timeline.length} Events</span>
        </div>

        <div className="bg-white border border-line rounded-lg p-5 font-mono text-xs divide-y divide-line/60">
          {timeline.length === 0 ? (
            <div className="text-muted">No timeline entries found.</div>
          ) : (
            timeline.map((item) => (
              <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3">
                <span className="text-muted shrink-0 text-[11px]">{item.timeStr}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] shrink-0 font-bold ${
                    item.actor === "system"
                      ? "bg-line text-ink"
                      : item.actor === "gemini"
                      ? "bg-amber/15 text-amber"
                      : item.actor === "merchant"
                      ? "bg-green/15 text-green"
                      : "bg-line text-muted"
                  }`}
                >
                  [{item.actor.toUpperCase()}]
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-ink">{item.title}: </span>
                  <span className="text-muted">{item.detail}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
