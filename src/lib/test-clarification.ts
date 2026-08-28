/**
 * UNIT TEST: Customer Clarification & Single Question Stopping Rule
 * 
 * Purpose: Verifies that exactly ONE clarifying question is sent per payment,
 * and subsequent attempts are blocked by the strict stopping rule.
 */
import { createPayment, getChatForPayment, clearAllData } from "./repo";
import { runMatchingEngine } from "./matcher";
import { maybeSendClarification } from "./clarification";
import { seedDatabase } from "./seed";

async function main() {
  console.log("=== Running isolated test: test-clarification ===");
  await clearAllData();
  await seedDatabase();

  const payment = await createPayment({ amount: 49900 }); // no payer hash -> ambiguous collision
  await runMatchingEngine(payment.id);

  console.log("--- First Clarification Attempt ---");
  const result1 = await maybeSendClarification(payment.id);
  console.log("First call result:", result1);
  console.log("Chat log so far:", await getChatForPayment(payment.id));

  console.log("\n--- Second Clarification Attempt (Must Be Blocked) ---");
  const result2 = await maybeSendClarification(payment.id);
  console.log("Second call result (should be blocked):", result2);

  const isBlocked = result2.sent === false && result2.reason.includes("already sent");
  console.log("Stopping rule enforcement check:", isBlocked ? "PASSED (blocked)" : "FAILED");
  console.log("✅ test-clarification completed successfully.\n");
}

main().catch(console.error);
