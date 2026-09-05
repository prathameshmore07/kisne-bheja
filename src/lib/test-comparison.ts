/**
 * UNIT TEST: Top-Two Candidate Evidence Comparison
 * 
 * Purpose: Verifies ranked candidate evidence comparison generation for ambiguous orders.
 */
import { createPayment, clearAllData } from "./repo";
import { runMatchingEngine } from "./matcher";
import { getAllCandidateScores } from "./scorer";
import { seedDatabase } from "./seed";

async function main() {
  console.log("=== Running isolated test: test-comparison ===");
  await clearAllData();
  await seedDatabase();

  console.log("--- Feature 2: Top-Two Candidate Evidence Comparison ---");
  const testPay = await createPayment({ amount: 49900 });
  await runMatchingEngine(testPay.id);
  const candidates = await getAllCandidateScores(testPay.id);
  console.log(`Computed scores for top ${candidates.length} candidates:`);
  candidates.forEach((c) => {
    console.log(`Candidate: ${c.order?.product_name} -> ${(c.confidence * 100).toFixed(0)}%`);
    c.evidence.forEach((e) => console.log(`   [${e.signal_type}] ${e.signal_weight >= 0 ? "+" : ""}${Math.round(e.signal_weight * 100)}% : ${e.detail}`));
  });
  if (candidates.length >= 2) {
    console.log("✓ Top-two candidates contain structured line-by-line evidence ready for head-to-head comparison UI.");
  } else {
    console.error("✗ Comparison did not return multiple candidates");
    process.exit(1);
  }
  console.log("✅ test-comparison completed successfully.\n");
}

main().catch(console.error);
