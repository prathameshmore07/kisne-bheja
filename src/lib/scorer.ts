import {
  Order,
  Payment,
  EvidenceEntry,
  SignalType,
  PaymentStatus,
} from "./types";
import {
  appendEvidence,
  getEvidenceForPayment,
  getOrderById,
  updatePaymentConfidence,
  addAudit,
} from "./repo";

export interface ScorerSignal {
  signal_type: SignalType;
  weight: number;
  detail: string;
}

export interface CandidateScore {
  candidate_order_id: string;
  confidence: number;
  order?: Order;
  evidence: EvidenceEntry[];
}

export type RecommendedAction = "auto_link" | "merchant_approval" | "ask_customer";

// ---------- PURE SIGNAL GENERATORS ----------

export function scoreAmountMatch(
  paymentAmount: number,
  orderAmount: number,
  sameAmountCount: number = 1
): ScorerSignal | null {
  if (paymentAmount === orderAmount) {
    if (sameAmountCount === 1) {
      return {
        signal_type: "amount_match",
        weight: 0.75,
        detail: `Unique exact amount match (₹${(paymentAmount / 100).toFixed(2)})`,
      };
    } else {
      return {
        signal_type: "amount_match",
        weight: 0.45,
        detail: `Exact amount match with ${sameAmountCount} collisions (₹${(paymentAmount / 100).toFixed(2)})`,
      };
    }
  }

  if (paymentAmount < orderAmount) {
    const ratio = paymentAmount / orderAmount;
    return {
      signal_type: "partial",
      weight: 0.15 * ratio,
      detail: `Partial payment of ₹${(paymentAmount / 100).toFixed(2)} for ₹${(orderAmount / 100).toFixed(2)} order (${Math.round(ratio * 100)}%)`,
    };
  }

  return {
    signal_type: "negative",
    weight: -0.5,
    detail: `Payment amount ₹${(paymentAmount / 100).toFixed(2)} exceeds order amount ₹${(orderAmount / 100).toFixed(2)}`,
  };
}

export function scoreTiming(
  paymentReceivedAt: number,
  orderCreatedAt: number
): ScorerSignal | null {
  const diffMs = paymentReceivedAt - orderCreatedAt;
  const diffMinutes = diffMs / 60_000;

  if (diffMinutes < 0) {
    return {
      signal_type: "negative",
      weight: -0.3,
      detail: "Payment timestamp precedes order creation time",
    };
  }

  if (diffMinutes <= 5) {
    return {
      signal_type: "timing",
      weight: 0.15,
      detail: `Payment received ${Math.round(diffMinutes)}m after order creation (fresh)`,
    };
  }

  if (diffMinutes <= 15) {
    return {
      signal_type: "timing",
      weight: 0.1,
      detail: `Payment received ${Math.round(diffMinutes)}m after order creation`,
    };
  }

  if (diffMinutes <= 60) {
    return {
      signal_type: "timing",
      weight: 0.05,
      detail: `Payment received ${Math.round(diffMinutes)}m after order creation`,
    };
  }

  if (diffMinutes <= 1440) {
    return {
      signal_type: "timing",
      weight: 0.02,
      detail: `Payment received ${Math.round(diffMinutes / 60)}h after order creation`,
    };
  }

  return {
    signal_type: "order_age",
    weight: -0.1,
    detail: `Order is stale (${Math.round(diffMinutes / 1440)}d old)`,
  };
}

export function scorePayerHistory(
  payerVpaHash: string | null | undefined,
  customerVpaHash: string | null | undefined
): ScorerSignal | null {
  if (!payerVpaHash || !customerVpaHash) {
    return null;
  }

  if (payerVpaHash === customerVpaHash) {
    return {
      signal_type: "payer_history",
      weight: 0.35,
      detail: "Payer VPA hash matches customer record",
    };
  }

  return {
    signal_type: "negative",
    weight: -0.2,
    detail: "Payer VPA hash differs from customer record",
  };
}

export function scoreLinkMetadata(
  paymentLinkId: string | null | undefined,
  orderId: string
): ScorerSignal | null {
  if (!paymentLinkId) return null;
  return {
    signal_type: "link_metadata",
    weight: 0.4,
    detail: `Payment link ${paymentLinkId} tied to order ${orderId}`,
  };
}

export function scoreConversation(
  confidenceWeight: number,
  detail: string
): ScorerSignal {
  return {
    signal_type: "conversation",
    weight: confidenceWeight,
    detail,
  };
}

// ---------- CONFIDENCE LEDGER & RECOMPUTE ----------

export function addEvidenceAndRecompute(input: {
  payment_id: string;
  candidate_order_id: string;
  signal_type: SignalType;
  signal_weight: number;
  detail?: string;
}): EvidenceEntry {
  const existingEvidence = getEvidenceForPayment(input.payment_id).filter(
    (e) => e.candidate_order_id === input.candidate_order_id
  );
  const currentSum = existingEvidence.reduce((sum, e) => sum + e.signal_weight, 0);
  const newConfidence = Math.max(
    0,
    Math.min(1, Math.round((currentSum + input.signal_weight) * 1000) / 1000)
  );

  const entry = appendEvidence({
    payment_id: input.payment_id,
    candidate_order_id: input.candidate_order_id,
    signal_type: input.signal_type,
    signal_weight: input.signal_weight,
    detail: input.detail,
    confidence_after: newConfidence,
  });

  const best = getBestCandidate(input.payment_id);
  if (best) {
    const action = determineAction(best.confidence);
    let status: PaymentStatus = "unresolved";
    if (action === "auto_link") {
      status = "ambiguous"; // ready for auto resolution or confirmation
    } else if (action === "merchant_approval") {
      status = "ambiguous";
    } else {
      status = "unresolved";
    }
    updatePaymentConfidence(input.payment_id, best.confidence, status);
  }

  return entry;
}

export function getAllCandidateScores(paymentId: string): CandidateScore[] {
  const evidenceList = getEvidenceForPayment(paymentId);
  const grouped = new Map<string, EvidenceEntry[]>();

  for (const ev of evidenceList) {
    if (!grouped.has(ev.candidate_order_id)) {
      grouped.set(ev.candidate_order_id, []);
    }
    grouped.get(ev.candidate_order_id)!.push(ev);
  }

  const scores: CandidateScore[] = [];

  for (const [candidate_order_id, evs] of grouped.entries()) {
    const rawSum = evs.reduce((sum, e) => sum + e.signal_weight, 0);
    const confidence = Math.max(0, Math.min(1, Math.round(rawSum * 1000) / 1000));
    const order = getOrderById(candidate_order_id);
    scores.push({
      candidate_order_id,
      confidence,
      order,
      evidence: evs,
    });
  }

  return scores.sort((a, b) => b.confidence - a.confidence);
}

export function getBestCandidate(paymentId: string): CandidateScore | undefined {
  const scores = getAllCandidateScores(paymentId);
  return scores.length > 0 ? scores[0] : undefined;
}

export function determineAction(confidence: number): RecommendedAction {
  const autoThreshold = parseFloat(process.env.CONFIDENCE_AUTO_THRESHOLD || "0.85");
  const approvalThreshold = parseFloat(process.env.CONFIDENCE_APPROVAL_THRESHOLD || "0.60");

  if (confidence >= autoThreshold) {
    return "auto_link";
  }
  if (confidence > approvalThreshold) {
    return "merchant_approval";
  }
  return "ask_customer";
}
