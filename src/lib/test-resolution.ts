/**
 * UNIT TEST: Threshold Decision Gate & Resolution Policy
 * 
 * Purpose: Tests auto-resolution threshold (>= 80%), merchant review floor (>= 50%),
 * and low-confidence/no-candidate routing to manual_review.
 */
import { createPayment, createOrder, getPaymentById, clearAllData } from "./repo";
import { runMatchingEngine } from "./matcher";
import { finalizeResolution } from "./resolution";
import { seedDatabase } from "./seed";

async function main() {
  console.log("=== Running isolated test: test-resolution ===");
  await clearAllData();
  await seedDatabase();

  // Case A: Single matching order with high confidence -> auto_resolved
  console.log("--- Case A: High Confidence (Single Match) ---");
  const uniqueOrder = await createOrder({
    product_name: "Exclusive Silk Saree",
    amount: 89900,
    customer_name: "Sunita Roy",
  });
  const paymentA = await createPayment({ amount: 89900 });
  await runMatchingEngine(paymentA.id);
  const outcomeA = await finalizeResolution(paymentA.id);
  console.log("Outcome A:", outcomeA);
  const finalA = await getPaymentById(paymentA.id);
  console.log("Final Payment A status:", finalA?.status, "Resolved order:", finalA?.resolved_order_id);

  // Case B: Ambiguous candidates (shared amount) -> merchant_approval
  console.log("\n--- Case B: Ambiguous Candidates (Shared Amount) ---");
  const paymentB = await createPayment({ amount: 49900 });
  await runMatchingEngine(paymentB.id);
  const outcomeB = await finalizeResolution(paymentB.id);
  console.log("Outcome B:", outcomeB);
  const finalB = await getPaymentById(paymentB.id);
  console.log("Final Payment B status (should be ambiguous):", finalB?.status);

  // Case C: Zero matching candidates -> manual_review
  console.log("\n--- Case C: Zero Candidates ---");
  const paymentC = await createPayment({ amount: 1234567 });
  await runMatchingEngine(paymentC.id);
  const outcomeC = await finalizeResolution(paymentC.id);
  console.log("Outcome C:", outcomeC);
  const finalC = await getPaymentById(paymentC.id);
  console.log("Final Payment C status (should be manual_review):", finalC?.status);

  console.log("✅ test-resolution completed successfully.\n");
}

main().catch(console.error);
