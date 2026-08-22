import {
  getPaymentById,
  addChatMessage,
  addAudit,
} from "./repo";
import { getAllCandidateScores, addEvidenceAndRecompute } from "./scorer";
import { interpretCustomerReply } from "./gemini";
import { finalizeResolution, FinalizationOutcome } from "./resolution";

export interface ProcessReplyResult {
  matched_order_hint: string | null;
  confidence_signal: number;
  reasoning: string;
}

export async function processCustomerReply(
  paymentId: string,
  customerMessage: string
): Promise<{ interpretation: ProcessReplyResult; outcome: FinalizationOutcome }> {
  const payment = getPaymentById(paymentId);
  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  // 1. Store incoming message in simulated chat
  addChatMessage(paymentId, "customer", customerMessage);

  // 2. Prepare candidates for Gemini
  const allCandidates = getAllCandidateScores(paymentId);
  if (allCandidates.length === 0) {
    addAudit({
      payment_id: paymentId,
      action: "manual_review",
      actor: "system",
      detail: "Customer replied but no candidate orders exist for this payment — sent to manual review",
    });
    return {
      interpretation: {
        matched_order_hint: null,
        confidence_signal: 0,
        reasoning: "No candidates to interpret against",
      },
      outcome: "manual_review",
    };
  }

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
    const signalWeight = Math.round(interpretation.confidence_signal * 0.45 * 100) / 100;

    addEvidenceAndRecompute({
      payment_id: paymentId,
      candidate_order_id: interpretation.matched_order_hint,
      signal_type: "conversation",
      signal_weight: signalWeight,
      detail: `Customer confirmed order: "${customerMessage}" (${interpretation.reasoning})`,
    });
  }

  // 6. Finalize resolution based on updated confidence and stopping rule
  const outcome = finalizeResolution(paymentId, { afterClarification: true });
  return { interpretation, outcome };
}