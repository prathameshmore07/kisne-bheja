import { createPayment } from "./repo";
import { runMatchingEngine } from "./matcher";
import { maybeSendClarification } from "./clarification";
import { processCustomerReply } from "./reply";
import { formatTimelineForConsole } from "./audit";
import { getBestCandidate } from "./scorer";
import { seedDatabase } from "./seed";

async function main() {
  await seedDatabase();
  const payment = await createPayment({ amount: 49900 }); // no payer hash -> genuinely ambiguous
  await runMatchingEngine(payment.id);
  console.log("Confidence before reply:", await getBestCandidate(payment.id));

  await maybeSendClarification(payment.id);
  const interpretation = await processCustomerReply(payment.id, "haan blue kurta wala");
  console.log("Interpretation:", interpretation);
  console.log("Confidence after reply:", await getBestCandidate(payment.id));

  console.log("\n=== TIMELINE ===");
  console.log(await formatTimelineForConsole(payment.id));
}

main().catch(console.error);
