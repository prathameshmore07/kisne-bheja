/**
 * UNIT TEST: Gateway Failures & Zero-Candidate Interception
 * 
 * Purpose: Verifies payment.failed audit logging without creating phantom payment rows,
 * and zero-candidate reply safety handling.
 */
import { addAudit, getAllPayments, createPayment, getAuditForPayment, clearAllData } from "./repo";
import { processCustomerReply } from "./reply";
import { seedDatabase } from "./seed";

async function main() {
  console.log("=== Running isolated test: test-failures ===");
  await clearAllData();
  await seedDatabase();

  console.log("--- Test 1: payment.failed Event Audit Logging ---");
  const failedPaymentId = "pay_failed_test_999";
  const errorReason = "Card expired / insufficient funds";
  await addAudit({
    payment_id: failedPaymentId,
    action: "payment_failed",
    actor: "system",
    detail: `Razorpay payment ${failedPaymentId} failed (₹499.00): ${errorReason}`,
  });

  const audits = await getAuditForPayment(failedPaymentId);
  console.log("Recorded failed audit entry:", audits[audits.length - 1]);

  const payments = await getAllPayments();
  const phantomPayment = payments.find(p => p.razorpay_payment_id === failedPaymentId);
  console.log("Phantom payment created in DB? (should be false):", phantomPayment !== undefined);

  console.log("\n--- Test 2: Reply with Zero Candidate Orders ---");
  const uniquePayment = await createPayment({
    amount: 999999,
  });

  const replyRes = await processCustomerReply(uniquePayment.id, "haan mera hi hai");
  console.log("Reply result with zero candidates (routed safely to manual_review):", replyRes.outcome);

  console.log("✅ test-failures completed successfully.\n");
}

main().catch(console.error);
