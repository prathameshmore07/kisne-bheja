import { createPaymentFromWebhook } from "./repo";
import { runMatchingEngine } from "./matcher";
import { formatTimelineForConsole } from "./audit";

const payment = createPaymentFromWebhook({
  razorpay_payment_id: "pay_test_demo123",
  amount: 49900,
  payer_vpa_hash: "vpa_hash_priya_001",
});

runMatchingEngine(payment.id);

console.log("=== TIMELINE ===");
console.log(formatTimelineForConsole(payment.id));
