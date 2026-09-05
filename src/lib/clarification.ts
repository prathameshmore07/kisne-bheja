import {
  getPaymentById,
  getAuditForPayment,
  addAudit,
  getRecentlyResolvedPayments,
  getClarificationFraming,
  setClarificationFraming,
} from "./repo";
import { getAllCandidateScores, determineAction } from "./scorer";
import { generateMerchantClarificationFraming, MerchantFraming } from "./gemini";

export interface ClarificationResult {
  generated: boolean;
  reason: string;
  framing?: MerchantFraming;
  // Aliases for compatibility
  sent?: boolean;
  message?: string;
}

export async function maybeGenerateMerchantClarification(
  paymentId: string,
  options: { force?: boolean } = {}
): Promise<ClarificationResult> {
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    return { generated: false, sent: false, reason: "payment not found" };
  }

  if (payment.status === "resolved") {
    return { generated: false, sent: false, reason: "payment is already resolved" };
  }

  const allCandidates = await getAllCandidateScores(paymentId);
  if (allCandidates.length === 0) {
    return { generated: false, sent: false, reason: "no candidate orders found" };
  }

  if (!options.force) {
    const best = allCandidates[0];
    const action = determineAction(best.confidence);
    if (action === "auto_link") {
      return { generated: false, sent: false, reason: `action is ${action}, not clarify` };
    }
  }

  // Max 1 follow-up stopping rule: check if framing was already generated or logged in audit trail
  const existingFraming = getClarificationFraming(paymentId);
  if (existingFraming && !options.force) {
    return {
      generated: false,
      sent: false,
      reason: "clarification framing already generated (max 1 rule)",
      framing: existingFraming,
      message: existingFraming.distinguishing_question,
    };
  }

  const audits = await getAuditForPayment(paymentId);
  const alreadyGenerated = audits.some(
    (a: any) => a.action === "clarification_sent" && a.actor === "gemini"
  );
  if (alreadyGenerated && !options.force) {
    return {
      generated: false,
      sent: false,
      reason: "clarification framing already recorded in audit log (max 1 rule)",
    };
  }

  // Fetch recent resolved payments for live pattern recognition
  const recentList = await getRecentlyResolvedPayments(60);
  const recentResolvedInfo = recentList.map((r) => ({
    id: r.payment.id,
    amount: r.payment.amount,
    product_name: r.order?.product_name ?? null,
    customer_name: r.order?.customer_name ?? null,
    resolved_at: r.payment.resolved_at,
  }));

  const candidatesForFraming = allCandidates.map((c) => ({
    order_id: c.candidate_order_id,
    product_name: c.order?.product_name ?? "Unknown order",
    amount: c.order?.amount,
    customer_name: c.order?.customer_name,
    created_at: c.order?.created_at,
  }));

  const framing = await generateMerchantClarificationFraming({
    payment: {
      id: payment.id,
      amount: payment.amount,
      received_at: payment.received_at,
      payment_method: payment.payment_method,
    },
    candidates: candidatesForFraming,
    recentResolvedPayments: recentResolvedInfo,
  });

  setClarificationFraming(payment.id, framing);

  await addAudit({
    payment_id: payment.id,
    action: "clarification_sent",
    actor: "gemini",
    detail: `AI Framing: "${framing.distinguishing_question}"${
      framing.recent_pattern_insight ? ` [Pattern: ${framing.recent_pattern_insight}]` : ""
    }`,
  });

  return {
    generated: true,
    sent: true,
    reason: "generated",
    framing,
    message: framing.distinguishing_question,
  };
}

// Alias for backward compatibility
export const maybeSendClarification = maybeGenerateMerchantClarification;
