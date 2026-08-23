import { hashVpa } from "./hash";
import { createPaymentFromWebhook, getPaymentByRazorpayId, getAllPayments } from "./repo";
import { runMatchingEngine } from "./matcher";

const razorpayPaymentId = "pay_test_idempotency_check_123";
const amount = 49900;
const rawVpa = "priya.sharma@oksbi";
const payer_vpa_hash = hashVpa(rawVpa);

async function processWebhookEvent(rzpId: string) {
  const existing = await getPaymentByRazorpayId(rzpId);
  if (existing) {
    console.log("IDEMPOTENCY HIT: Payment already processed with ID:", existing.id);
    return { status: "already_processed", payment_id: existing.id };
  }

  const payment = await createPaymentFromWebhook({
    razorpay_payment_id: rzpId,
    amount,
    payer_vpa_hash,
  });

  try {
    await runMatchingEngine(payment.id);
  } catch (err: any) {
    console.error("Matching engine error:", err);
  }

  console.log("NEW PAYMENT PROCESSED: Created payment ID:", payment.id);
  return { status: "processed", payment_id: payment.id };
}

async function main() {
  console.log("--- First Webhook Delivery ---");
  const res1 = await processWebhookEvent(razorpayPaymentId);

  console.log("--- Second Webhook Delivery (Retry/Duplicate) ---");
  const res2 = await processWebhookEvent(razorpayPaymentId);

  const payments = await getAllPayments();
  const count = payments.filter((p) => p.razorpay_payment_id === razorpayPaymentId).length;
  console.log("Duplicate check in DB (should be 1):", count === 1 ? "PASSED (count = 1)" : "FAILED");
}

main().catch(console.error);
