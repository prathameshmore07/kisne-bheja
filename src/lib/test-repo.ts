import { createPayment, getCandidateOrders, appendEvidence, getEvidenceForPayment } from "./repo";
import { seedDatabase } from "./seed";

async function run() {
  await seedDatabase();
  const payment = await createPayment({ amount: 49900, payer_vpa_hash: "vpa_hash_test_customer" });
  console.log("Created payment:", payment.id, payment.amount);

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
}

run().catch(console.error);
