import { createPaymentFromWebhook } from "./repo";
import { runMatchingEngine } from "./matcher";
import { formatTimelineForConsole } from "./audit";
import { hashVpa } from "./hash";
import { seedDatabase } from "./seed";

async function run() {
  await seedDatabase();
  const payment = await createPaymentFromWebhook({
    razorpay_payment_id: "pay_test_demo123",
    amount: 49900,
    payer_vpa_hash: hashVpa("priya.sharma@okhdfcbank"),
  });

  await runMatchingEngine(payment.id);

  console.log("=== TIMELINE ===");
  console.log(await formatTimelineForConsole(payment.id));
}

run().catch(console.error);
