/**
 * UNIT TEST: Merchant Overrides (Approve, Reject, Unlink)
 * 
 * Purpose: Tests manual 1-tap confirmation, explicit candidate rejection (-100%),
 * and unlinking with negative penalty propagation and order status restoration.
 */
import { createPayment, getPaymentById, getOrderById, createOrder, clearAllData } from "./repo";
import { runMatchingEngine } from "./matcher";
import { approvePayment, rejectPayment, unlinkPaymentAction } from "./merchantActions";
import { getAllCandidateScores } from "./scorer";
import { seedDatabase } from "./seed";

async function main() {
  console.log("=== Running isolated test: test-merchant-actions ===");
  await clearAllData();
  await seedDatabase();

  const orderA = await createOrder({ product_name: "Test Red Kurta", amount: 49900 });
  const orderB = await createOrder({ product_name: "Test Blue Kurta", amount: 49900 });

  const payment = await createPayment({ amount: 49900 });
  await runMatchingEngine(payment.id);

  const candidates = await getAllCandidateScores(payment.id);
  const redKurta = candidates.find(c => c.candidate_order_id === orderA.id)!;
  const blueKurta = candidates.find(c => c.candidate_order_id === orderB.id)!;

  console.log("--- Initial Candidates Count:", candidates.length);

  // 1. Test Reject (-100% negative evidence)
  console.log("\n1. Testing Candidate Rejection...");
  await rejectPayment(payment.id, redKurta.candidate_order_id);
  const afterReject = await getAllCandidateScores(payment.id);
  const rejectedRed = afterReject.find(c => c.candidate_order_id === redKurta.candidate_order_id);
  console.log("Red Kurta confidence after rejection (should be 0):", rejectedRed?.confidence);

  // 2. Test Approve
  console.log("\n2. Testing Manual Approval...");
  await approvePayment(payment.id, blueKurta.candidate_order_id);
  const paymentAfterApprove = (await getPaymentById(payment.id))!;
  const orderAfterApprove = (await getOrderById(blueKurta.candidate_order_id))!;
  console.log("Payment status after approve:", paymentAfterApprove.status, "Resolved order:", paymentAfterApprove.resolved_order_id);
  console.log("Order status after approve:", orderAfterApprove.status);

  // 3. Test Unlink (Restores order to pending, records negative penalty)
  console.log("\n3. Testing Unlinking & Negative Penalty Propagation...");
  await unlinkPaymentAction(payment.id);
  const paymentAfterUnlink = (await getPaymentById(payment.id))!;
  const orderAfterUnlink = (await getOrderById(blueKurta.candidate_order_id))!;
  console.log("Payment status after unlink:", paymentAfterUnlink.status, "Resolved order (should be null):", paymentAfterUnlink.resolved_order_id);
  console.log("Order status after unlink (should be pending):", orderAfterUnlink.status);

  console.log("✅ test-merchant-actions completed successfully.\n");
}

main().catch(console.error);
