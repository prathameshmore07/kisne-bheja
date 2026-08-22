import { getPaymentById, getOrderById } from "@/lib/repo";
import { getAllCandidateScores } from "@/lib/scorer";
import { getTimelineForPayment } from "@/lib/audit";
import { formatRupees } from "@/lib/format";
import LiveConfidence from "@/components/LiveConfidence";
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

      {/* Live Animated Evidence Graph */}
      <section className="mb-10">
        <LiveConfidence
          paymentId={payment.id}
          initialPayment={{
            id: payment.id,
            status: payment.status,
            confidence: payment.confidence,
            amount: payment.amount,
            resolved_order_id: payment.resolved_order_id,
          }}
          initialCandidates={candidateScores.map((c) => ({
            order_id: c.candidate_order_id,
            product_name: c.order?.product_name ?? "Unknown order",
            amount: c.order?.amount,
            customer_name: c.order?.customer_name,
            customer_vpa_hash: c.order?.customer_vpa_hash,
            confidence: c.confidence,
            evidence: c.evidence,
          }))}
        />
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
