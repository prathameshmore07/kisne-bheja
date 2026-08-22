import crypto from "crypto";
import { hashVpa } from "./hash";
import { createPaymentFromWebhook, getPaymentById } from "./repo";
import { runMatchingEngine } from "./matcher";

// Simulate the webhook ingestion logic
const secret = "test_webhook_secret_123";
const payload = {
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: "pay_test_live_webhook_999",
        amount: 49900,
        currency: "INR",
        status: "captured",
        vpa: "priya.sharma@oksbi",
      }
    }
  }
};

const rawBody = JSON.stringify(payload);
const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

// Verify HMAC
const calculated = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
const isValid = crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(signature));
console.log("HMAC Signature verification valid:", isValid);

// Process webhook
const paymentEntity = payload.payload.payment.entity;
const payer_vpa_hash = paymentEntity.vpa ? hashVpa(paymentEntity.vpa) : undefined;
console.log("Hashed VPA from raw VPA:", payer_vpa_hash);

const payment = createPaymentFromWebhook({
  razorpay_payment_id: paymentEntity.id,
  amount: paymentEntity.amount,
  payer_vpa_hash: payer_vpa_hash,
});

const result = runMatchingEngine(payment.id);
console.log("Webhook triggered matching result:", result.action, "Best order:", result.best?.order?.product_name, "Confidence:", result.best?.confidence);
