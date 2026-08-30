/**
 * UNIT TEST: Audit Trail & Timeline Formatting
 * 
 * Purpose: Verifies plain-language operational event logging and timeline rendering.
 */
import { createPaymentFromWebhook, clearAllData } from "./repo";
import { runMatchingEngine } from "./matcher";
import { formatTimelineForConsole } from "./audit";
import { hashPayerIdentity } from "./hash";
import { seedDatabase } from "./seed";

async function run() {
  console.log("=== Running isolated test: test-audit ===");
  await clearAllData();
  await seedDatabase();

  const payment = await createPaymentFromWebhook({
    razorpay_payment_id: "pay_test_audit_123",
    amount: 49900,
    payer_identity_hash: hashPayerIdentity("1111_visa"),
    payment_method: "card",
    payer_card_last4: "1111",
    payer_card_network: "Visa",
  });

  await runMatchingEngine(payment.id);

  console.log("=== PLAIN-LANGUAGE AUDIT TIMELINE ===");
  console.log(await formatTimelineForConsole(payment.id));
  console.log("✅ test-audit completed successfully.\n");
}

run().catch(console.error);
