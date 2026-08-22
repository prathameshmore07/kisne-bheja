import { addAudit, getAllPayments } from "./repo";
import { processCustomerReply } from "./reply";
import db from "./db";

async function main() {
  console.log("--- Test 1: payment.failed Event Audit Logging ---");
  const failedPaymentId = "pay_failed_test_999";
  const errorReason = "Card expired / insufficient funds";
  addAudit({
    payment_id: failedPaymentId,
    action: "payment_failed",
    actor: "system",
    detail: `Razorpay payment ${failedPaymentId} failed (₹499.00): ${errorReason}`,
  });

  const auditEntry = db.prepare("SELECT action, detail FROM audit_log WHERE action = 'payment_failed' ORDER BY created_at DESC LIMIT 1").get() as any;
  console.log("Recorded failed audit entry:", auditEntry);

  const payments = getAllPayments();
  const phantomPayment = payments.find(p => p.razorpay_payment_id === failedPaymentId);
  console.log("Phantom payment created in DB? (should be false):", phantomPayment !== undefined);

  console.log("\n--- Test 2: Reply with Zero Candidate Orders ---");
  // Create a payment with no candidates by using an arbitrary amount and no matching pending orders
  const uniquePayment = db.prepare("INSERT INTO payments (id, amount, status, confidence, received_at) VALUES (?, ?, ?, ?, ?) RETURNING *").get(
    "pay_zero_candidates",
    999999,
    "manual_review",
    0,
    Date.now()
  ) as any;

  const replyRes = await processCustomerReply(uniquePayment.id, "haan mera hi hai");
  console.log("Reply result with zero candidates:", replyRes);
}

main();
