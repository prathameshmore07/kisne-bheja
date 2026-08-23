import { createPayment, getPaymentById } from "./repo";
import { runMatchingEngine } from "./matcher";
import { maybeSendClarification } from "./clarification";
import { processCustomerReply } from "./reply";
import { seedDatabase } from "./seed";

async function main() {
  await seedDatabase();
  // Case A: clear reply -> should auto-resolve or land in merchant_approval
  const paymentA = await createPayment({ amount: 49900 });
  await runMatchingEngine(paymentA.id);
  await maybeSendClarification(paymentA.id);
  const resultA = await processCustomerReply(paymentA.id, "haan blue kurta wala");
  console.log("CASE A — clear reply:", resultA.outcome);
  console.log("Final payment A:", await getPaymentById(paymentA.id));

  // Case B: unhelpful reply -> should fall to manual_review
  await seedDatabase();
  const paymentB = await createPayment({ amount: 49900 });
  await runMatchingEngine(paymentB.id);
  await maybeSendClarification(paymentB.id);
  const resultB = await processCustomerReply(paymentB.id, "pata nahi kaunsa tha");
  console.log("\nCASE B — vague reply:", resultB.outcome);
  console.log("Final payment B:", await getPaymentById(paymentB.id));
}

main().catch(console.error);
