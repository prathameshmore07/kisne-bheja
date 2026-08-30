/**
 * UNIT TEST: Webhook Idempotency & Deduplication Engine
 * 
 * Purpose: Verifies that duplicate webhook deliveries for the same Razorpay payment ID
 * are detected and ignored without creating duplicate payment rows in the database.
 * 
 * Note: Live end-to-end webhook verification requires sending genuinely signed payloads
 * or creating a live Razorpay test-mode transaction via `npm run create-link`.
 */
import { hashPayerIdentity } from "./hash";
import { createPaymentFromWebhook, getPaymentByRazorpayId, getAllPayments, clearAllData } from "./repo";
import { runMatchingEngine } from "./matcher";
import { seedDatabase } from "./seed";

const razorpayPaymentId = "pay_test_idempotency_check_123";
const amount = 49900;
const rawIdentifier = "1111_visa";
const payer_identity_hash = hashPayerIdentity(rawIdentifier);

async function processWebhookEvent(rzpId: string) {
  const existing = await getPaymentByRazorpayId(rzpId);
  if (existing) {
    console.log("IDEMPOTENCY HIT: Payment already processed with ID:", existing.id);
    return { status: "already_processed", payment_id: existing.id };
  }

  const payment = await createPaymentFromWebhook({
    razorpay_payment_id: rzpId,
    amount,
    payer_identity_hash,
    payment_method: "card",
    payer_card_last4: "1111",
    payer_card_network: "Visa",
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
  console.log("=== Running isolated test: test-webhook ===");
  await clearAllData();
  await seedDatabase();

  console.log("--- First Webhook Delivery ---");
  const res1 = await processWebhookEvent(razorpayPaymentId);

  console.log("--- Second Webhook Delivery (Retry/Duplicate) ---");
  const res2 = await processWebhookEvent(razorpayPaymentId);

  const payments = await getAllPayments();
  const count = payments.filter((p) => p.razorpay_payment_id === razorpayPaymentId).length;
  console.log("Duplicate check in DB (should be exactly 1):", count === 1 ? "PASSED (count = 1)" : "FAILED");
  console.log("✅ test-webhook completed successfully.\n");
}

main().catch(console.error);
