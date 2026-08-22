import { createPayment } from "./repo";
import { runMatchingEngine } from "./matcher";
import { maybeSendClarification } from "./clarification";
import { getChatForPayment } from "./repo";

async function main() {
  const payment = createPayment({ amount: 49900 }); // no payer hash -> genuinely ambiguous, no tiebreak
  runMatchingEngine(payment.id);

  const result1 = await maybeSendClarification(payment.id);
  console.log("First call:", result1);
  console.log("Chat so far:", getChatForPayment(payment.id));

  const result2 = await maybeSendClarification(payment.id);
  console.log("Second call (should be blocked by stopping rule):", result2);
}
main();