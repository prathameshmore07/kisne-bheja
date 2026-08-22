import { createPayment, getPaymentById, getOrderById, createOrder } from "./repo";
import { runMatchingEngine } from "./matcher";
import { approvePayment, rejectPayment, unlinkPaymentAction } from "./merchantActions";
import { getAllCandidateScores } from "./scorer";

async function main() {
  const orderA = createOrder({ product_name: "Test Red Kurta", amount: 49900 });
  const orderB = createOrder({ product_name: "Test Blue Kurta", amount: 49900 });

  const payment = createPayment({ amount: 49900 });
  runMatchingEngine(payment.id);

  const candidates = getAllCandidateScores(payment.id);
  const redKurta = candidates.find(c => c.candidate_order_id === orderA.id)!;
  const blueKurta = candidates.find(c => c.candidate_order_id === orderB.id)!;

  console.log("--- Initial Candidates Count:", candidates.length);

  // 1. Test Reject
  console.log("Rejecting Red Kurta...");
  rejectPayment(payment.id, redKurta.candidate_order_id);
  const afterReject = getAllCandidateScores(payment.id);
  const rejectedRed = afterReject.find(c => c.candidate_order_id === redKurta.candidate_order_id);
  console.log("Red Kurta confidence after rejection:", rejectedRed?.confidence);

  // 2. Test Approve
  console.log("Approving Blue Kurta...");
  approvePayment(payment.id, blueKurta.candidate_order_id);
  const paymentAfterApprove = getPaymentById(payment.id)!;
  const orderAfterApprove = getOrderById(blueKurta.candidate_order_id)!;
  console.log("Payment status after approve:", paymentAfterApprove.status, "Resolved order:", paymentAfterApprove.resolved_order_id);
  console.log("Order status after approve:", orderAfterApprove.status);

  // 3. Test Unlink
  console.log("Unlinking Blue Kurta...");
  unlinkPaymentAction(payment.id);
  const paymentAfterUnlink = getPaymentById(payment.id)!;
  const orderAfterUnlink = getOrderById(blueKurta.candidate_order_id)!;
  console.log("Payment status after unlink:", paymentAfterUnlink.status, "Resolved order:", paymentAfterUnlink.resolved_order_id);
  console.log("Order status after unlink (should be pending):", orderAfterUnlink.status);
}

main();
