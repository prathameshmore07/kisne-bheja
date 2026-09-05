import {
  getPaymentById,
  getOrderById,
  getBatchResolutionInfoForPayment,
  getClarificationFraming,
} from "@/lib/repo";
import { getAllCandidateScores } from "@/lib/scorer";
import { formatRupees } from "@/lib/format";
import LiveConfidence from "@/components/LiveConfidence";
import MerchantClarificationCard from "@/components/MerchantClarificationCard";
import Link from "next/link";
import BrandWordmark from "@/components/BrandWordmark";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ paymentId: string }>;
}

export default async function PaymentDetailPage({ params }: PageProps) {
  const { paymentId } = await params;
  const payment = await getPaymentById(paymentId);

  if (!payment) {
    notFound();
  }

  const resolvedOrder = payment.resolved_order_id ? await getOrderById(payment.resolved_order_id) : undefined;
  const candidateScores = await getAllCandidateScores(paymentId);
  const batchResolution = await getBatchResolutionInfoForPayment(paymentId);
  const initialFraming = getClarificationFraming(paymentId) || null;

  const candidates = candidateScores.map((c) => ({
    order_id: c.candidate_order_id,
    product_name: c.order?.product_name ?? "Unknown order",
    amount: c.order?.amount,
    customer_name: c.order?.customer_name,
    customer_identity_hash: c.order?.customer_identity_hash ?? c.order?.customer_vpa_hash,
    customer_vpa_hash: c.order?.customer_identity_hash ?? c.order?.customer_vpa_hash,
    confidence: c.confidence,
    evidence: c.evidence,
  }));

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* Header Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-xs font-mono text-muted hover:text-ink transition-colors inline-flex items-center gap-1.5"
        >
          <span>←</span> <span>Back to all payments</span>
        </Link>
        <Link href="/" className="inline-block hover:opacity-85 transition-opacity">
          <BrandWordmark size="sm" />
        </Link>
      </div>

      {/* Payment Overview — Plain Document Style */}
      <section className="pb-8 mb-10 border-b border-line">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink tracking-tight">
              {formatRupees(payment.amount)}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted font-mono mt-2">
              <span>Payment: {payment.id.slice(0, 8)}</span>
              {payment.razorpay_payment_id && <span>Gateway: {payment.razorpay_payment_id}</span>}
              <span>Received: {new Date(payment.received_at).toLocaleTimeString("en-IN")}</span>
            </div>
          </div>
        </div>

        {resolvedOrder && (
          <div className="mt-4 pt-4 border-t border-line/60 flex flex-wrap items-center justify-between gap-3 text-sm font-body">
            <div className="flex items-center gap-2">
              <span className="text-muted">Matched to:</span>
              <span className="font-medium text-ink">
                {resolvedOrder.product_name} ({formatRupees(resolvedOrder.amount)}) · {resolvedOrder.customer_name ?? "Customer"}
              </span>
            </div>
            <div className="text-xs font-mono px-2.5 py-1 rounded bg-green/10 text-green font-medium flex items-center gap-1.5 border border-green/20">
              <svg className="w-3.5 h-3.5 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Confirmed to customer · Ready to pack</span>
            </div>
          </div>
        )}
      </section>

      {/* AI-Assisted In-Dashboard Clarification Framing */}
      {payment.status !== "resolved" && (
        <section className="mb-12">
          <MerchantClarificationCard
            paymentId={payment.id}
            paymentAmount={payment.amount}
            paymentStatus={payment.status}
            candidates={candidates}
            initialFraming={initialFraming}
          />
        </section>
      )}

      {/* Candidate Breakdown & Reasoning */}
      <section className="mb-12">
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
            customer_identity_hash: c.order?.customer_identity_hash ?? c.order?.customer_vpa_hash,
            customer_vpa_hash: c.order?.customer_identity_hash ?? c.order?.customer_vpa_hash,
            confidence: c.confidence,
            evidence: c.evidence,
          }))}
          initialBatchResolution={batchResolution}
        />
      </section>
    </main>
  );
}
