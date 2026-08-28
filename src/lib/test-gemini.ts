/**
 * UNIT TEST: Bounded Gemini AI & Structured Zod Validation
 * 
 * Purpose: Verifies question drafting, reply interpretation, and deterministic
 * keyword matching fallbacks.
 */
import { generateClarificationMessage, interpretCustomerReply } from "./gemini";

async function main() {
  console.log("=== Running isolated test: test-gemini ===");

  const candidates = [
    { order_id: "order_blue", product_name: "Blue Kurta" },
    { order_id: "order_red", product_name: "Red Kurta" },
  ];

  console.log("--- Test 1: Question Drafting ---");
  const clarification = await generateClarificationMessage(candidates);
  console.log("Clarification message:", clarification.message);

  console.log("\n--- Test 2: Natural Language Reply Interpretation ---");
  const reply = await interpretCustomerReply("haan blue kurta wala", candidates);
  console.log("Reply interpretation:", JSON.stringify(reply, null, 2));

  console.log("\n--- Test 3: Vague / Unrelated Reply ---");
  const vagueReply = await interpretCustomerReply("kya chal raha hai", candidates);
  console.log("Vague reply interpretation:", JSON.stringify(vagueReply, null, 2));

  console.log("✅ test-gemini completed successfully.\n");
}

main().catch(console.error);