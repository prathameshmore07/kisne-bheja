import { createPayment, getCandidateOrders, appendEvidence, getEvidenceForPayment } from "./repo";

const payment = createPayment({ amount: 49900, payer_vpa_hash: "vpa_hash_test_customer" });
console.log("Created payment:", payment.id, payment.amount);

const candidates = getCandidateOrders(payment.amount);
console.log("Candidates found:", candidates.map(c => c.product_name));

if (candidates.length > 0) {
  const ev = appendEvidence({
    payment_id: payment.id,
    candidate_order_id: candidates[0].id,
    signal_type: "amount_match",
    signal_weight: 0.3,
    detail: "Exact amount match",
    confidence_after: 0.3,
  });
  console.log("Evidence:", getEvidenceForPayment(payment.id));
}
