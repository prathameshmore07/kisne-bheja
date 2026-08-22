import { createPayment, getPaymentById } from "./repo";
import { runMatchingEngine } from "./matcher";
import { maybeSendClarification } from "./clarification";
import { processCustomerReply } from "./reply";

async function main() {
  // Case A: clear reply -> should auto-resolve or land in merchant_approval
  const paymentA = createPayment({ amount: 49900 });
  runMatchingEngine(paymentA.id);
  await maybeSendClarification(paymentA.id);
  const resultA = await processCustomerReply(paymentA.id, "haan blue kurta wala");
  console.log("CASE A — clear reply:", resultA.outcome);
  console.log("Final payment A:", getPaymentById(paymentA.id));

  // Case B: unhelpful reply -> should fall to manual_review
  const paymentB = createPayment({ amount: 49900 });
  runMatchingEngine(paymentB.id);
  await maybeSendClarification(paymentB.id);
  const resultB = await processCustomerReply(paymentB.id, "haan");
  console.log("\nCASE B — vague reply:", resultB.outcome);
  console.log("Final payment B:", getPaymentById(paymentB.id));
}
main();