import {
  getPaymentById,
  addChatMessage,
  addAudit,
} from "./repo";
import { getAllCandidateScores, addEvidenceAndRecompute } from "./scorer";
import { interpretCustomerReply } from "./gemini";

export interface ProcessReplyResult {
  matched_order_hint: string | null;
  confidence_signal: number;
  reasoning: string;
}

export async function processCustomerReply(
  paymentId: string,
  customerMessage: string
): Promise<ProcessReplyResult> {
  const payment = getPaymentById(paymentId);
  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  // 1. Store incoming message in simulated chat
  addChatMessage(paymentId, "customer", customerMessage);

  // 2. Prepare candidates for Gemini
  const allCandidates = getAllCandidateScores(paymentId);
  const candidatesForGemini = allCandidates.map((c) => ({
    order_id: c.candidate_order_id,
    product_name: c.order?.product_name ?? "Unknown order",
  }));

  // 3. Interpret reply with Gemini (or deterministic keyword fallback)
  const interpretation = await interpretCustomerReply(
    customerMessage,
    candidatesForGemini
  );

  // 4. Log audit entry for interpretation
  addAudit({
    payment_id: paymentId,
    action: "reply_interpreted",
    actor: "gemini",
    detail: `Interpreted reply "${customerMessage}" -> hint: ${
      interpretation.matched_order_hint ?? "none"
    } (${Math.round(interpretation.confidence_signal * 100)}%). ${interpretation.reasoning}`,
  });

  // 5. If a candidate was matched with positive confidence, append conversation signal to ledger
  if (
    interpretation.matched_order_hint &&
    interpretation.confidence_signal > 0
  ) {
    const matchedCandidate = allCandidates.find(
      (c) => c.candidate_order_id === interpretation.matched_order_hint
    );

    const signalWeight = Math.round(interpretation.confidence_signal * 0.45 * 100) / 100;

    addEvidenceAndRecompute({
      payment_id: paymentId,
      candidate_order_id: interpretation.matched_order_hint,
      signal_type: "conversation",
      signal_weight: signalWeight,
      detail: `Customer confirmed order: "${customerMessage}" (${interpretation.reasoning})`,
    });
  }
  return interpretation;
}