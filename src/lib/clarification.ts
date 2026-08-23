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

export interface ClarificationOptions {
  force?: boolean;
  language?: "hinglish" | "english" | "hindi";
}

export async function maybeSendClarification(
  paymentId: string,
  options: ClarificationOptions = {}
): Promise<ClarificationResult> {
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    return { sent: false, reason: "payment not found" };
  }

  if (payment.status === "resolved") {
    return { sent: false, reason: "payment is already resolved" };
  }

  const allCandidates = await getAllCandidateScores(paymentId);
  if (allCandidates.length === 0) {
    return { sent: false, reason: "no candidate orders found" };
  }

  if (!options.force) {
    const best = allCandidates[0];
    const action = determineAction(best.confidence);
    if (action === "auto_link") {
      return { sent: false, reason: `action is ${action}, not clarify` };
    }
  }

  // Max 1 follow-up stopping rule: check if clarification was already sent
  const existingChat = await getChatForPayment(paymentId);
  const alreadySent = existingChat.some((c) => c.sender === "merchant_system");
  if (alreadySent && !options.force) {
    return { sent: false, reason: "clarification already sent (max 1 follow-up rule)" };
  }

  // Prepare candidates for Gemini
  const candidatesForGemini = allCandidates.map((c) => ({
    order_id: c.candidate_order_id,
    product_name: c.order?.product_name ?? "Unknown order",
    amount: c.order?.amount,
  }));

  const clarification = await generateClarificationMessage(
    candidatesForGemini,
    options.language || "hinglish"
  );

  // Record in simulated chat & audit log
  await addChatMessage(payment.id, "merchant_system", clarification.message);
  await addAudit({
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
