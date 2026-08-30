import {
  getPaymentById,
  getCandidateOrders,
  getPendingOrders,
  resolvePayment,
  updatePaymentConfidence,
  addAudit,
  getMerchantRules,
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

  for (const order of candidatePool) {
    const amt = scoreAmountMatch(payment.amount, order.amount, sameAmountCount);
    if (amt) {
      await addEvidenceAndRecompute({
        payment_id: payment.id,
        candidate_order_id: order.id,
        signal_type: amt.signal_type,
        signal_weight: amt.weight,
        detail: amt.detail,
      });
    }

    const timing = scoreTiming(payment.received_at, order.created_at);
    if (timing) {
      await addEvidenceAndRecompute({
        payment_id: payment.id,
        candidate_order_id: order.id,
        signal_type: timing.signal_type,
        signal_weight: timing.weight,
        detail: timing.detail,
      });
    }

    const payer = scorePayerHistory(
      payment.payer_identity_hash,
      order.customer_identity_hash,
      { last4: payment.payer_card_last4, network: payment.payer_card_network },
      { last4: order.customer_card_last4, network: order.customer_card_network }
    );
    if (payer) {
      await addEvidenceAndRecompute({
        payment_id: payment.id,
        candidate_order_id: order.id,
        signal_type: payer.signal_type,
        signal_weight: payer.weight,
        detail: payer.detail,
      });
    }

    // Evaluate custom merchant rules
    const merchantRules = await getMerchantRules();
    for (const rule of merchantRules) {
      const ruleSignal = scoreMerchantRule(rule, order, payment);
      if (ruleSignal) {
        await addEvidenceAndRecompute({
          payment_id: payment.id,
          candidate_order_id: order.id,
          signal_type: ruleSignal.signal_type,
          signal_weight: ruleSignal.weight,
          detail: ruleSignal.detail,
        });
      }
    }

    if (paymentLinkOrderId && order.id === paymentLinkOrderId) {
      const link = scoreLinkMetadata(payment.razorpay_payment_link_id ?? "payment_link", order.id);
      if (link) {
        await addEvidenceAndRecompute({
          payment_id: payment.id,
          candidate_order_id: order.id,
          signal_type: link.signal_type,
          signal_weight: link.weight,
          detail: `Payment link metadata explicitly matches order: ${order.product_name}`,
        });
      }
    }
  }

  const best = await getBestCandidate(payment.id);
  const allCandidateScores = await getAllCandidateScores(payment.id);

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
