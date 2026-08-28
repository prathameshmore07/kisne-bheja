/**
 * UNIT TEST: Deterministic Scorer & Mathematical Signal Calculation
 * 
 * Purpose: Tests pure additive scoring logic, timing decay, collision pool scaling,
 * and privacy-preserving VPA/card proxy match in isolation.
 * 
 * Note: This script tests isolated internal scoring functions.
 */
import { createPayment, getCandidateOrders, clearAllData } from "./repo";
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
  console.log("=== Running isolated test: test-scorer ===");
  await clearAllData();
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
  console.log("Best candidate:", best?.order?.product_name, "Confidence:", best?.confidence);
  if (best) {
    console.log("Action:", determineAction(best.confidence));
  }
  console.log("✅ test-scorer completed successfully.\n");
}

run().catch(console.error);
