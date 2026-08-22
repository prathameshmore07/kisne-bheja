import { addEvidenceAndRecompute } from "./scorer";
import { getAllPayments, getCandidateOrders } from "./repo";

const payments = getAllPayments();
if (payments.length > 0) {
  const p = payments[0];
  const candidates = getCandidateOrders(p.amount);
  if (candidates.length > 0) {
    const c = candidates[0];
    addEvidenceAndRecompute({
      payment_id: p.id,
      candidate_order_id: c.id,
      signal_type: "conversation",
      signal_weight: 0.3,
      detail: "Manual live-test nudge",
    });
    console.log("Live test evidence added successfully for payment:", p.id, "order:", c.product_name);
  } else {
    console.log("No candidates found for payment", p.id);
  }
} else {
  console.log("No payments in database to test");
}
