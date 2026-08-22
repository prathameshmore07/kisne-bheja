import { createPayment } from "./repo";
import { runMatchingEngine } from "./matcher";
import { maybeSendClarification } from "./clarification";
import { processCustomerReply } from "./reply";
import { formatTimelineForConsole } from "./audit";
import { getBestCandidate } from "./scorer";

async function main() {
  const payment = createPayment({ amount: 49900 }); // no payer hash -> genuinely ambiguous
  runMatchingEngine(payment.id);
  console.log("Confidence before reply:", getBestCandidate(payment.id));

  await maybeSendClarification(payment.id);
  const interpretation = await processCustomerReply(payment.id, "haan blue kurta wala");
  console.log("Interpretation:", interpretation);
  console.log("Confidence after reply:", getBestCandidate(payment.id));

  console.log("\n=== TIMELINE ===");
  console.log(formatTimelineForConsole(payment.id));
}
main();