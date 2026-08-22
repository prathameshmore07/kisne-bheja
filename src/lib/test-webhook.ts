import { hashVpa } from "./hash";
import { createPaymentFromWebhook, getPaymentByRazorpayId } from "./repo";
import { runMatchingEngine } from "./matcher";
import db from "./db";

const razorpayPaymentId = "pay_test_idempotency_check_123";
const amount = 49900;
const rawVpa = "priya.sharma@oksbi";
const payer_vpa_hash = hashVpa(rawVpa);

function processWebhookEvent(rzpId: string) {
  const existing = getPaymentByRazorpayId(rzpId);
  if (existing) {
    console.log("IDEMPOTENCY HIT: Payment already processed with ID:", existing.id);
    return { status: "already_processed", payment_id: existing.id };
  }

  const payment = createPaymentFromWebhook({
    razorpay_payment_id: rzpId,
    amount,
    payer_vpa_hash,
  });

  try {
    runMatchingEngine(payment.id);
  } catch (err: any) {
    console.error("Matching engine error:", err);
  }

  console.log("NEW PAYMENT PROCESSED: Created payment ID:", payment.id);
  return { status: "processed", payment_id: payment.id };
}

console.log("--- First Webhook Delivery ---");
const res1 = processWebhookEvent(razorpayPaymentId);

console.log("--- Second Webhook Delivery (Retry/Duplicate) ---");
const res2 = processWebhookEvent(razorpayPaymentId);

const dupCheck = db.prepare("SELECT razorpay_payment_id, COUNT(*) as count FROM payments WHERE razorpay_payment_id = ? GROUP BY razorpay_payment_id").get(razorpayPaymentId) as any;
console.log("Duplicate check in DB (should be 1):", dupCheck?.count === 1 ? "PASSED (count = 1)" : "FAILED");
