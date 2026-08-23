import { createPayment, getPaymentById, getOrderById, createOrder } from "./repo";
import { runMatchingEngine } from "./matcher";
import { approvePayment, rejectPayment, unlinkPaymentAction } from "./merchantActions";
import { getAllCandidateScores } from "./scorer";
import { seedDatabase } from "./seed";

async function main() {
  await seedDatabase();
  const orderA = await createOrder({ product_name: "Test Red Kurta", amount: 49900 });
  const orderB = await createOrder({ product_name: "Test Blue Kurta", amount: 49900 });

  const payment = await createPayment({ amount: 49900 });
  await runMatchingEngine(payment.id);

  const candidates = await getAllCandidateScores(payment.id);
  const redKurta = candidates.find(c => c.candidate_order_id === orderA.id)!;
  const blueKurta = candidates.find(c => c.candidate_order_id === orderB.id)!;

  console.log("--- Initial Candidates Count:", candidates.length);

  // 1. Test Reject
  console.log("Rejecting Red Kurta...");
  await rejectPayment(payment.id, redKurta.candidate_order_id);
  const afterReject = await getAllCandidateScores(payment.id);
  const rejectedRed = afterReject.find(c => c.candidate_order_id === redKurta.candidate_order_id);
  console.log("Red Kurta confidence after rejection:", rejectedRed?.confidence);

  // 2. Test Approve
  console.log("Approving Blue Kurta...");
  await approvePayment(payment.id, blueKurta.candidate_order_id);
  const paymentAfterApprove = (await getPaymentById(payment.id))!;
  const orderAfterApprove = (await getOrderById(blueKurta.candidate_order_id))!;
  console.log("Payment status after approve:", paymentAfterApprove.status, "Resolved order:", paymentAfterApprove.resolved_order_id);
  console.log("Order status after approve:", orderAfterApprove.status);

  // 3. Test Unlink
  console.log("Unlinking Blue Kurta...");
  await unlinkPaymentAction(payment.id);
  const paymentAfterUnlink = (await getPaymentById(payment.id))!;
  const orderAfterUnlink = (await getOrderById(blueKurta.candidate_order_id))!;
  console.log("Payment status after unlink:", paymentAfterUnlink.status, "Resolved order:", paymentAfterUnlink.resolved_order_id);
  console.log("Order status after unlink (should be pending):", orderAfterUnlink.status);
}

main().catch(console.error);
