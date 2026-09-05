import {
  getPaymentById,
  getCandidateOrders,
  getPendingOrders,
  resolvePayment,
  updatePaymentConfidence,
  addAudit,
  getMerchantRules,
  appendEvidenceBatch,
} from "./repo";
import {
  scoreAmountMatch,
  scoreTiming,
  scorePayerHistory,
  scoreMerchantRule,
  scoreLinkMetadata,
  addEvidenceAndRecompute,
  getBestCandidate,
  getAllCandidateScores,
  determineAction,
  CandidateScore,
  RecommendedAction,
} from "./scorer";
import { EvidenceEntry } from "./types";

export interface MatchingResult {
  action: RecommendedAction | "manual_review";
  paymentId: string;
  best?: CandidateScore;
  candidates: CandidateScore[];
}

export async function runMatchingEngine(
  paymentId: string,
  paymentLinkOrderId?: string
): Promise<MatchingResult> {
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    throw new Error(`Payment with id ${paymentId} not found`);
  }

  // Fetch pending candidate orders that could plausibly match
  const allPending = await getCandidateOrders(payment.amount);
  const exactCandidates = allPending.filter((o) => o.amount === payment.amount);

  let candidatePool: typeof allPending = [];
  if (exactCandidates.length > 0) {
    candidatePool = exactCandidates;
  } else {
    // Check if it could be a partial payment towards a larger order
    const pendingOrders = await getPendingOrders();
    const partialCandidates = pendingOrders.filter((o) => o.amount > payment.amount);
    candidatePool = partialCandidates;
  }

  if (candidatePool.length === 0) {
    await updatePaymentConfidence(payment.id, 0, "manual_review");
    await addAudit({
      payment_id: payment.id,
      action: "manual_review",
      actor: "system",
      detail: "No matching candidate orders found for payment amount",
    });
    return {
      action: "manual_review",
      paymentId: payment.id,
      best: undefined,
      candidates: [],
    };
  }

  const sameAmountCount = exactCandidates.length;
  const merchantRules = await getMerchantRules();

  const evidenceToInsert: Array<{
    payment_id: string;
    candidate_order_id: string;
    signal_type: any;
    signal_weight: number;
    detail?: string;
    confidence_after: number;
  }> = [];

  const candidatesWithScores: CandidateScore[] = [];

  for (const order of candidatePool) {
    const signals: Array<{ signal_type: any; weight: number; detail?: string }> = [];

    const amt = scoreAmountMatch(payment.amount, order.amount, sameAmountCount);
    if (amt) signals.push({ signal_type: amt.signal_type, weight: amt.weight, detail: amt.detail });

    const timing = scoreTiming(payment.received_at, order.created_at);
    if (timing) signals.push({ signal_type: timing.signal_type, weight: timing.weight, detail: timing.detail });

    const payer = scorePayerHistory(
      payment.payer_identity_hash,
      order.customer_identity_hash,
      { last4: payment.payer_card_last4, network: payment.payer_card_network },
      { last4: order.customer_card_last4, network: order.customer_card_network }
    );
    if (payer) signals.push({ signal_type: payer.signal_type, weight: payer.weight, detail: payer.detail });

    // Evaluate custom merchant rules
    for (const rule of merchantRules) {
      const ruleSignal = scoreMerchantRule(rule, order, payment);
      if (ruleSignal) signals.push({ signal_type: ruleSignal.signal_type, weight: ruleSignal.weight, detail: ruleSignal.detail });
    }

    if (paymentLinkOrderId && order.id === paymentLinkOrderId) {
      const link = scoreLinkMetadata(payment.razorpay_payment_link_id ?? "payment_link", order.id);
      if (link) {
        signals.push({
          signal_type: link.signal_type,
          weight: link.weight,
          detail: `Payment link metadata explicitly matches order: ${order.product_name}`,
        });
      }
    }

    let runningConfidence = 0;
    const orderEvidence: EvidenceEntry[] = [];
    for (const s of signals) {
      runningConfidence = Math.max(0, Math.min(1, Math.round((runningConfidence + s.weight) * 1000) / 1000));
      evidenceToInsert.push({
        payment_id: payment.id,
        candidate_order_id: order.id,
        signal_type: s.signal_type,
        signal_weight: s.weight,
        detail: s.detail,
        confidence_after: runningConfidence,
      });
      orderEvidence.push({
        id: 0,
        payment_id: payment.id,
        candidate_order_id: order.id,
        signal_type: s.signal_type,
        signal_weight: s.weight,
        detail: s.detail ?? null,
        confidence_after: runningConfidence,
        created_at: Date.now(),
      });
    }

    candidatesWithScores.push({
      candidate_order_id: order.id,
      confidence: runningConfidence,
      order,
      evidence: orderEvidence,
    });
  }

  if (evidenceToInsert.length > 0) {
    await appendEvidenceBatch(evidenceToInsert);
  }

  candidatesWithScores.sort((a, b) => b.confidence - a.confidence);
  const best = candidatesWithScores[0];
  const allCandidateScores = candidatesWithScores;

  if (!best) {
    await updatePaymentConfidence(payment.id, 0, "manual_review");
    return {
      action: "manual_review",
      paymentId: payment.id,
      best: undefined,
      candidates: [],
    };
  }

  const action = determineAction(best.confidence);

  if (action === "auto_link") {
    await resolvePayment(payment.id, best.candidate_order_id, best.confidence);
    await addAudit({
      payment_id: payment.id,
      action: "auto_resolved",
      actor: "system",
      detail: `Auto-linked payment ${payment.id} to order ${best.order?.product_name ?? best.candidate_order_id} with confidence ${(best.confidence * 100).toFixed(0)}%`,
    });
  } else if (action === "merchant_approval") {
    await updatePaymentConfidence(payment.id, best.confidence, "ambiguous");
    await addAudit({
      payment_id: payment.id,
      action: "evidence_added",
      actor: "system",
      detail: `Candidate ${best.order?.product_name ?? best.candidate_order_id} reached ${(best.confidence * 100).toFixed(0)}% confidence; routed for merchant review`,
    });
  } else {
    await updatePaymentConfidence(payment.id, best.confidence, "unresolved");
    await addAudit({
      payment_id: payment.id,
      action: "clarification_sent",
      actor: "system",
      detail: `Ambiguous payment with highest confidence ${(best.confidence * 100).toFixed(0)}%; automated clarification initiated`,
    });
  }

  return {
    action,
    paymentId: payment.id,
    best,
    candidates: allCandidateScores,
  };
}
