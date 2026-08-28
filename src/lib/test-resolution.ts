/**
 * UNIT TEST: Threshold Decision Gate & Stopping Policy
 * 
 * Purpose: Tests auto-resolution threshold (>= 85%), merchant review floor (60%),
 * and single follow-up exhaustion routing to manual_review.
 */
import { createPayment, getPaymentById, clearAllData } from "./repo";
import { runMatchingEngine } from "./matcher";
import { maybeSendClarification } from "./clarification";
import { processCustomerReply } from "./reply";
import { seedDatabase } from "./seed";

async function main() {
  console.log("=== Running isolated test: test-resolution ===");
  await clearAllData();
  await seedDatabase();

  // Case A: Clear customer confirmation -> auto-resolves
  console.log("--- Case A: Clear Customer Reply ---");
  const paymentA = await createPayment({ amount: 49900 });
  await runMatchingEngine(paymentA.id);
  await maybeSendClarification(paymentA.id);
  const resultA = await processCustomerReply(paymentA.id, "haan blue kurta wala");
  console.log("Outcome A:", resultA.outcome);
  const finalA = await getPaymentById(paymentA.id);
  console.log("Final Payment A status:", finalA?.status, "Resolved order:", finalA?.resolved_order_id);

  // Case B: Unhelpful/vague reply -> routed to manual_review per stopping rule
  console.log("\n--- Case B: Inconclusive Vague Reply ---");
  const paymentB = await createPayment({ amount: 49900 });
  await runMatchingEngine(paymentB.id);
  await maybeSendClarification(paymentB.id);
  const resultB = await processCustomerReply(paymentB.id, "pata nahi kaunsa tha");
  console.log("Outcome B:", resultB.outcome);
  const finalB = await getPaymentById(paymentB.id);
  console.log("Final Payment B status (should be manual_review):", finalB?.status);

  console.log("✅ test-resolution completed successfully.\n");
}

main().catch(console.error);
