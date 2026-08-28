import { validateEnv } from "./env";
import { createPaymentLink } from "./razorpay";

async function main() {
  validateEnv();

  const amountRupees = parseFloat(process.argv[2] || "499");
  const description = process.argv[3] || "Kisne Bheja Live Test Payment (Blue vs Red Kurta)";
  const orderId = process.argv[4];

  const amountPaise = Math.round(amountRupees * 100);

  console.log("=========================================================");
  console.log("    KISNE BHEJA — LIVE RAZORPAY PAYMENT LINK GENERATOR   ");
  console.log("=========================================================");
  console.log(`Creating test payment link for ₹${amountRupees.toFixed(2)} (${amountPaise} paise)...`);
  if (orderId) {
    console.log(`Tied to Order ID: ${orderId}`);
  }

  try {
    const link = await createPaymentLink({
      amount: amountPaise,
      description,
      orderId,
    });

    console.log("\n✅ Payment link created successfully on Razorpay (Test Mode)!");
    console.log(`Payment Link ID: ${link.id}`);
    console.log(`\n👉 LIVE CHECKOUT URL: ${link.short_url}\n`);
    console.log("---------------------------------------------------------");
    console.log("How to test this live:");
    console.log("1. Open the checkout URL in your browser.");
    console.log("2. Use standard Razorpay test credentials:");
    console.log("   - Test UPI: success@razorpay (or any UPI handle)");
    console.log("   - Test Card: 4111 2222 3333 4444 (Expiry: 12/28, CVV: 123)");
    console.log("3. Complete the payment.");
    console.log("4. Razorpay will deliver a real webhook to /api/webhook,");
    console.log("   verifying HMAC signature and initiating automated matching.");
    console.log("=========================================================\n");
  } catch (err: any) {
    console.error("❌ Failed to create Razorpay payment link:", err.message);
  }
}

main().catch(console.error);
