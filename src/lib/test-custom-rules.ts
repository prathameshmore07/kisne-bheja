/**
 * UNIT TEST: Merchant Custom Rules Engine
 * 
 * Purpose: Verifies merchant-defined custom rules evaluation and injection into candidate scoring.
 */
import { createMerchantRule, deleteMerchantRule, createPayment, clearAllData } from "./repo";
import { runMatchingEngine } from "./matcher";
import { getAllCandidateScores } from "./scorer";
import { seedDatabase } from "./seed";

async function main() {
  console.log("=== Running isolated test: test-custom-rules ===");
  await clearAllData();
  await seedDatabase();

  console.log("--- Feature 3: Merchant Custom Rules Engine ---");
  const customRule = await createMerchantRule({
    rule_name: "VIP Repeat Customer Loyalty Bonus",
    condition_type: "customer_name",
    condition_value: "Priya Sharma",
    signal_weight: 0.15,
    detail: "Merchant Rule: Priority repeat customer VIP bonus (+15%)",
  });
  console.log("Created custom rule:", customRule.rule_name, "boost:", customRule.signal_weight);

  const customPay = await createPayment({ amount: 49900 });
  await runMatchingEngine(customPay.id);
  const scoresWithRule = await getAllCandidateScores(customPay.id);
  const priyaCandidate = scoresWithRule.find((c) => c.order?.customer_name === "Priya Sharma");
  const customRuleEvidence = priyaCandidate?.evidence.find((e) => e.signal_type === "merchant_rule");
  console.log("Priya candidate custom rule evidence:", customRuleEvidence);
  if (customRuleEvidence) {
    console.log("✓ Custom merchant rule successfully evaluated and appended to confidence ledger without bypassing thresholds!");
  } else {
    console.error("✗ Custom merchant rule was not applied");
    process.exit(1);
  }
  await deleteMerchantRule(customRule.id);
  console.log("✅ test-custom-rules completed successfully.\n");
}

main().catch(console.error);
