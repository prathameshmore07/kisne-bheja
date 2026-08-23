import { getPaymentById, getOrderById, getChatForPayment } from "@/lib/repo";
import { getAllCandidateScores } from "@/lib/scorer";
import { getTimelineForPayment } from "@/lib/audit";
import { formatRupees } from "@/lib/format";
import LiveConfidence from "@/components/LiveConfidence";
import SimulatedWhatsApp from "@/components/SimulatedWhatsApp";
import LiveAuditTimeline from "@/components/LiveAuditTimeline";
import Link from "next/link";
import Image from "next/image";
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
  const initialChat = getChatForPayment(paymentId);

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
          <Image
            src="/brand/typography/hero_typography.png"
            alt="kisne bheja"
            width={160}
            height={90}
            className="w-32 sm:w-36 h-auto object-contain -my-3"
          />
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
          <div className="mt-4 pt-4 border-t border-line/60 flex items-center justify-between text-sm font-body">
            <span className="text-muted">Matched to:</span>
            <span className="font-medium text-ink">
              {resolvedOrder.product_name} ({formatRupees(resolvedOrder.amount)}) · {resolvedOrder.customer_name ?? "Customer"}
            </span>
          </div>
        )}
      </section>

      {/* Customer Conversation (Simulated WhatsApp) */}
      <section className="mb-12">
        <SimulatedWhatsApp
          paymentId={payment.id}
          initialChat={initialChat}
          paymentStatus={payment.status}
        />
      </section>

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
            customer_name: c.order?.customer_name,
            customer_vpa_hash: c.order?.customer_vpa_hash,
            confidence: c.confidence,
            evidence: c.evidence,
          }))}
        />
      </section>

      {/* Activity Timeline */}
      <section className="pt-8 border-t border-line">
        <LiveAuditTimeline
          paymentId={payment.id}
          initialTimeline={timeline}
          paymentStatus={payment.status}
        />
      </section>
    </main>
  );
}
