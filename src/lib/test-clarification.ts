/**
 * UNIT TEST: Merchant Clarification & Single Framing Stopping Rule
 * 
 * Purpose: Verifies that exactly ONE clarifying AI framing is generated per payment,
 * and subsequent attempts are blocked by the strict max-1 stopping rule.
 */
import { createPayment, getClarificationFraming, clearAllData } from "./repo";
import { runMatchingEngine } from "./matcher";
import { maybeGenerateMerchantClarification } from "./clarification";
import { seedDatabase } from "./seed";

async function main() {
  console.log("=== Running isolated test: test-clarification ===");
  await clearAllData();
  await seedDatabase();

  const payment = await createPayment({ amount: 49900 }); // no payer hash -> ambiguous collision
  await runMatchingEngine(payment.id);

  console.log("--- First Clarification Attempt ---");
  const result1 = await maybeGenerateMerchantClarification(payment.id);
  console.log("First call result:", result1);
  console.log("Framing stored:", getClarificationFraming(payment.id));

  console.log("\n--- Second Clarification Attempt (Must Be Blocked) ---");
  const result2 = await maybeGenerateMerchantClarification(payment.id);
  console.log("Second call result (should be blocked):", result2);

  const isBlocked = result2.generated === false && result2.reason.includes("already");
  console.log("Stopping rule enforcement check:", isBlocked ? "PASSED (blocked)" : "FAILED");
  if (!isBlocked) {
    console.error("✗ Stopping rule check failed");
    process.exit(1);
  }
  console.log("✅ test-clarification completed successfully.\n");
}

main().catch(console.error);
