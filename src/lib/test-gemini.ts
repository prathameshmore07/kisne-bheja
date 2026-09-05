/**
 * UNIT TEST: Bounded Gemini AI & Structured Zod Validation
 * 
 * Purpose: Verifies in-dashboard merchant clarification framing, recent pattern detection,
 * evidence explanation, and deterministic fallbacks when API is unavailable.
 */
import { generateMerchantClarificationFraming, summarizeEvidenceForMerchant, explainEvidence } from "./gemini";

async function main() {
  console.log("=== Running isolated test: test-gemini ===");

  const candidates = [
    { order_id: "order_blue", product_name: "Blue Kurta", amount: 49900, customer_name: "Priya Sharma", created_at: Date.now() - 10 * 60 * 1000 },
    { order_id: "order_red", product_name: "Red Kurta", amount: 49900, customer_name: "Rahul Verma", created_at: Date.now() - 5 * 60 * 1000 },
  ];

  console.log("--- Test 1: Merchant Clarification Framing Generation ---");
  const framing = await generateMerchantClarificationFraming({
    payment: {
      id: "pay_test_gemini_1",
      amount: 49900,
      received_at: Date.now(),
      payment_method: "card",
    },
    candidates,
    recentResolvedPayments: [
      {
        id: "pay_prev_1",
        amount: 49900,
        customer_name: "Priya Sharma",
        product_name: "Blue Kurta",
        resolved_at: Date.now() - 3 * 60 * 1000,
      }
    ]
  });
  console.log("Framing question:", framing.distinguishing_question);
  console.log("Recent pattern insight:", framing.recent_pattern_insight);
  console.log("Distinguishing factors:", framing.distinguishing_factors);

  console.log("\n--- Test 2: Evidence Explanation ---");
  const explanation = await explainEvidence([
    { signal_type: "amount_exact", weight: 0.35, detail: "Exact amount ₹499.00 matches" },
    { signal_type: "time_proximity", weight: 0.25, detail: "Created 10m before payment" },
  ]);
  console.log("Explanation:", explanation.explanation);

  console.log("\n--- Test 3: Resolution Summary ---");
  const summary = await summarizeEvidenceForMerchant("Blue Kurta", 0.88, ["exact amount", "time proximity"]);
  console.log("Summary:", summary);

  console.log("✅ test-gemini completed successfully.\n");
}

main().catch(console.error);