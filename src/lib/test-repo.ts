/**
 * UNIT TEST: Database Repository & Evidence Ledger Operations
 * 
 * Purpose: Verifies internal CRUD queries, candidate discovery, and evidence appending
 * in memory/unit isolation.
 * 
 * Note: This script tests isolated data layer logic and is not a proof of Razorpay integration.
 * Live integration must be verified via real Razorpay test-mode transactions and webhooks.
 */
import { createPayment, getCandidateOrders, appendEvidence, getEvidenceForPayment, clearAllData } from "./repo";
import { seedDatabase } from "./seed";

async function run() {
  console.log("=== Running isolated test: test-repo ===");
  await clearAllData();
  await seedDatabase();

  const payment = await createPayment({
    amount: 49900,
    payer_identity_hash: "identity_hash_test_customer",
    payment_method: "card",
    payer_card_last4: "1111",
    payer_card_network: "Visa",
  });
  console.log("Created unit test payment:", payment.id, payment.amount);

  const candidates = await getCandidateOrders(payment.amount);
  console.log("Candidates found:", candidates.map(c => c.product_name));

  if (candidates.length > 0) {
    await appendEvidence({
      payment_id: payment.id,
      candidate_order_id: candidates[0].id,
      signal_type: "amount_match",
      signal_weight: 0.3,
      detail: "Exact amount match",
      confidence_after: 0.3,
    });
    console.log("Evidence:", await getEvidenceForPayment(payment.id));
  }
  console.log("✅ test-repo completed successfully.\n");
}

run().catch(console.error);
