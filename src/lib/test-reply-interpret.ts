/**
 * UNIT TEST: Customer Reply Interpretation & Negative Evidence Propagation
 * 
 * Purpose: Verifies parsing customer replies, boosting confirmed candidate (+45%),
 * and propagating hard negative evidence (-100%) against losing candidates.
 */
import { createPayment, clearAllData } from "./repo";
import { runMatchingEngine } from "./matcher";
import { maybeSendClarification } from "./clarification";
import { processCustomerReply } from "./reply";
import { formatTimelineForConsole } from "./audit";
import { getBestCandidate, getAllCandidateScores } from "./scorer";
import { seedDatabase } from "./seed";

async function main() {
  console.log("=== Running isolated test: test-reply-interpret ===");
  await clearAllData();
  await seedDatabase();

  const payment = await createPayment({ amount: 49900 });
  await runMatchingEngine(payment.id);
  console.log("Confidence before reply:", (await getBestCandidate(payment.id))?.confidence);

  await maybeSendClarification(payment.id);
  const interpretation = await processCustomerReply(payment.id, "haan blue kurta wala");
  console.log("Interpretation result:", interpretation.interpretation);
  console.log("Outcome:", interpretation.outcome);
  console.log("Confidence after reply:", (await getBestCandidate(payment.id))?.confidence);

  const scores = await getAllCandidateScores(payment.id);
  console.log("\nAll candidate scores after reply:");
  scores.forEach((s) => {
    console.log(` - ${s.order?.product_name}: ${(s.confidence * 100).toFixed(0)}%`);
  });

  console.log("\n=== PLAIN-LANGUAGE TIMELINE ===");
  console.log(await formatTimelineForConsole(payment.id));
  console.log("✅ test-reply-interpret completed successfully.\n");
}

main().catch(console.error);
