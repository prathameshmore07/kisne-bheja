import { createPayment, getCandidateOrders } from "./repo";
import {
  scoreAmountMatch,
  scoreTiming,
  scorePayerHistory,
  addEvidenceAndRecompute,
  getBestCandidate,
  determineAction,
} from "./scorer";

const payment = createPayment({ amount: 49900, payer_vpa_hash: "vpa_hash_priya_001" });
const candidates = getCandidateOrders(payment.amount).filter((o) => o.amount === payment.amount);
console.log("Candidates:", candidates.map((c) => c.product_name));

const sameAmountCount = candidates.length;

for (const order of candidates) {
  const amt = scoreAmountMatch(payment.amount, order.amount, sameAmountCount);
  if (amt) {
    addEvidenceAndRecompute({
      payment_id: payment.id,
      candidate_order_id: order.id,
      signal_type: amt.signal_type,
      signal_weight: amt.weight,
      detail: amt.detail,
    });
  }

  const timing = scoreTiming(payment.received_at, order.created_at);
  if (timing) {
    addEvidenceAndRecompute({
      payment_id: payment.id,
      candidate_order_id: order.id,
      signal_type: timing.signal_type,
      signal_weight: timing.weight,
      detail: timing.detail,
    });
  }

  const payer = scorePayerHistory(payment.payer_vpa_hash, order.customer_vpa_hash);
  if (payer) {
    addEvidenceAndRecompute({
      payment_id: payment.id,
      candidate_order_id: order.id,
      signal_type: payer.signal_type,
      signal_weight: payer.weight,
      detail: payer.detail,
    });
  }
}

console.log("Best candidate:", getBestCandidate(payment.id));
const best = getBestCandidate(payment.id)!;
console.log("Action:", determineAction(best.confidence));
