import { createOrder, createPayment, getPaymentById, getOrderById } from "./repo";
import { runMatchingEngine } from "./matcher";
import { runBatchResolution } from "./batchResolver";
import { seedDatabase } from "./seed";

async function main() {
  await seedDatabase();
  console.log("=== Testing Joint Batch Assignment ===");

  const orderA = await createOrder({
    product_name: "Batch Test Blue Kurta",
    amount: 49900,
    customer_name: "Priya",
  });
  const orderB = await createOrder({
    product_name: "Batch Test Red Kurta",
    amount: 49900,
    customer_name: "Rahul",
  });

  // Two payments arrive without pre-known VPA hashes
  const pay1 = await createPayment({
    amount: 49900,
    razorpay_payment_id: "pay_batch_1",
  });
  await runMatchingEngine(pay1.id);

  const pay2 = await createPayment({
    amount: 49900,
    razorpay_payment_id: "pay_batch_2",
  });
  await runMatchingEngine(pay2.id);

  console.log("Before Batch Resolution:");
  console.log("Payment 1 status:", (await getPaymentById(pay1.id))?.status, "confidence:", (await getPaymentById(pay1.id))?.confidence);
  console.log("Payment 2 status:", (await getPaymentById(pay2.id))?.status, "confidence:", (await getPaymentById(pay2.id))?.confidence);

  // Run Joint Assignment Optimization
  console.log("\nRunning solveBipartiteAssignment & runBatchResolution()...");
  const result = await runBatchResolution();
  console.log("Batch Resolution Result:", JSON.stringify(result, null, 2));

  console.log("\nAfter Batch Resolution:");
  const resolvedPay1 = (await getPaymentById(pay1.id))!;
  const resolvedPay2 = (await getPaymentById(pay2.id))!;

  console.log("Payment 1 resolved to:", resolvedPay1.resolved_order_id, "(Status:", resolvedPay1.status, "Confidence:", resolvedPay1.confidence, ")");
  console.log("Payment 2 resolved to:", resolvedPay2.resolved_order_id, "(Status:", resolvedPay2.status, "Confidence:", resolvedPay2.confidence, ")");

  const isSuccess =
    resolvedPay1.status === "resolved" &&
    resolvedPay2.status === "resolved" &&
    resolvedPay1.resolved_order_id !== null &&
    resolvedPay2.resolved_order_id !== null &&
    resolvedPay1.resolved_order_id !== resolvedPay2.resolved_order_id;

  console.log("\nJoint assignment verified successfully?", isSuccess ? "YES! Both untangled simultaneously to distinct orders." : "FAILED");
}

main().catch(console.error);
