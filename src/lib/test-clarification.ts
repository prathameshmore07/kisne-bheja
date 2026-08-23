import { createPayment, getChatForPayment } from "./repo";
import { runMatchingEngine } from "./matcher";
import { maybeSendClarification } from "./clarification";
import { seedDatabase } from "./seed";

async function main() {
  await seedDatabase();
  const payment = await createPayment({ amount: 49900 }); // no payer hash -> genuinely ambiguous, no tiebreak
  await runMatchingEngine(payment.id);

  const result1 = await maybeSendClarification(payment.id);
  console.log("First call:", result1);
  console.log("Chat so far:", await getChatForPayment(payment.id));

  const result2 = await maybeSendClarification(payment.id);
  console.log("Second call (should be blocked by stopping rule):", result2);
}

main().catch(console.error);
