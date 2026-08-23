import {
  getPaymentById,
  resolvePayment,
  updatePaymentConfidence,
  addAudit,
} from "./repo";
import { getBestCandidate } from "./scorer";

export type FinalizationOutcome = "auto_resolved" | "merchant_approval" | "manual_review";

export interface FinalizeOptions {
  afterClarification?: boolean;
}

export async function finalizeResolution(
  paymentId: string,
  options: FinalizeOptions = {}
): Promise<FinalizationOutcome> {
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  if (payment.status === "resolved") {
    return "auto_resolved";
  }

  const best = await getBestCandidate(paymentId);
  if (!best) {
    await updatePaymentConfidence(payment.id, 0, "manual_review");
    await addAudit({
      payment_id: payment.id,
      action: "manual_review",
      actor: "system",
      detail: "No matching candidate orders found for payment",
    });
    return "manual_review";
  }

  const autoThreshold = parseFloat(process.env.CONFIDENCE_AUTO_THRESHOLD || "0.85");
  const approvalThreshold = parseFloat(process.env.CONFIDENCE_APPROVAL_THRESHOLD || "0.60");

  if (best.confidence >= autoThreshold) {
    await resolvePayment(payment.id, best.candidate_order_id, best.confidence);
    await addAudit({
      payment_id: payment.id,
      action: "auto_resolved",
      actor: "system",
      detail: `Auto-resolved payment to "${best.order?.product_name}" with ${Math.round(
        best.confidence * 100
      )}% confidence`,
    });
    return "auto_resolved";
  }

  if (best.confidence > approvalThreshold) {
    await updatePaymentConfidence(payment.id, best.confidence, "ambiguous");
    await addAudit({
      payment_id: payment.id,
      action: "evidence_added",
      actor: "system",
      detail: `Confidence at ${Math.round(
        best.confidence * 100
      )}% for "${best.order?.product_name}" — awaiting merchant approval`,
    });
    return "merchant_approval";
  }

  if (options.afterClarification) {
    await updatePaymentConfidence(payment.id, best.confidence, "manual_review");
    await addAudit({
      payment_id: payment.id,
      action: "manual_review",
      actor: "system",
      detail: `Clarification reply inconclusive (highest confidence ${Math.round(
        best.confidence * 100
      )}%). Sent to manual review per single follow-up rule.`,
    });
    return "manual_review";
  }

  return "manual_review";
}
