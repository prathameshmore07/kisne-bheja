import {
  getPaymentById,
  getChatForPayment,
  addChatMessage,
  addAudit,
} from "./repo";
import { getBestCandidate, getAllCandidateScores, determineAction } from "./scorer";
import { generateClarificationMessage } from "./gemini";

export interface ClarificationResult {
  sent: boolean;
  reason: string;
  message?: string;
}

export async function maybeSendClarification(paymentId: string): Promise<ClarificationResult> {
  const payment = getPaymentById(paymentId);
  if (!payment) {
    return { sent: false, reason: "payment not found" };
  }

  if (payment.status === "resolved") {
    return { sent: false, reason: "payment is already resolved" };
  }

  const best = getBestCandidate(paymentId);
  if (!best) {
    return { sent: false, reason: "no candidate orders found" };
  }

  const action = determineAction(best.confidence);
  if (action !== "ask_customer") {
    return { sent: false, reason: `action is ${action}, not clarify` };
  }

  // Max 1 follow-up stopping rule: check if clarification was already sent
  const existingChat = getChatForPayment(paymentId);
  const alreadySent = existingChat.some((c) => c.sender === "merchant_system");
  if (alreadySent) {
    return { sent: false, reason: "clarification already sent (max 1 follow-up rule)" };
  }

  // Prepare candidates for Gemini
  const allCandidates = getAllCandidateScores(paymentId);
  const candidatesForGemini = allCandidates.map((c) => ({
    order_id: c.candidate_order_id,
    product_name: c.order?.product_name ?? "Unknown order",
    amount: c.order?.amount,
  }));

  const clarification = await generateClarificationMessage(candidatesForGemini);

  // Record in simulated chat & audit log
  addChatMessage(payment.id, "merchant_system", clarification.message);
  addAudit({
    payment_id: payment.id,
    action: "clarification_sent",
    actor: "gemini",
    detail: `Sent clarification question: "${clarification.message}"`,
  });

  return {
    sent: true,
    reason: "sent",
    message: clarification.message,
  };
}