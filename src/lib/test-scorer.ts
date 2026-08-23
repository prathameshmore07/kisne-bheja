import { createPayment, getCandidateOrders } from "./repo";
import { hashVpa } from "./hash";
import { seedDatabase } from "./seed";
import {
  scoreAmountMatch,
  scoreTiming,
  scorePayerHistory,
  addEvidenceAndRecompute,
  getBestCandidate,
  determineAction,
} from "./scorer";

async function run() {
  await seedDatabase();
  const payment = await createPayment({ amount: 49900, payer_vpa_hash: hashVpa("priya.sharma@okhdfcbank") });
  const allCandidates = await getCandidateOrders(payment.amount);
  const candidates = allCandidates.filter((o) => o.amount === payment.amount);
  console.log("Candidates:", candidates.map((c) => c.product_name));

  const sameAmountCount = candidates.length;

  for (const order of candidates) {
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

    const payer = scorePayerHistory(payment.payer_vpa_hash, order.customer_vpa_hash);
    if (payer) {
      await addEvidenceAndRecompute({
        payment_id: payment.id,
        candidate_order_id: order.id,
        signal_type: payer.signal_type,
        signal_weight: payer.weight,
        detail: payer.detail,
      });
    }
  }

  const best = await getBestCandidate(payment.id);
  console.log("Best candidate:", best);
  if (best) {
    console.log("Action:", determineAction(best.confidence));
  }
}

run().catch(console.error);
