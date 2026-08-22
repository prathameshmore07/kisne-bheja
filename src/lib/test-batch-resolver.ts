import { createOrder, createPayment, getPaymentById, getOrderById } from "./repo";
import { hashVpa } from "./hash";
import { runMatchingEngine } from "./matcher";
import { runBatchResolution } from "./batchResolver";

async function main() {
  console.log("=== Testing Joint Batch Assignment ===");

  const now = Date.now();
  const orderA = createOrder({
    product_name: "Batch Test Blue Kurta",
    amount: 49900,
    customer_name: "Priya",
  });
  // Simulate orderB created 25 minutes earlier
  const orderB = createOrder({
    product_name: "Batch Test Red Kurta",
    amount: 49900,
    customer_name: "Rahul",
  });

  // Two payments arrive without pre-known VPA hashes
  const pay1 = createPayment({
    amount: 49900,
    razorpay_payment_id: "pay_batch_1",
  });
  runMatchingEngine(pay1.id);

  const pay2 = createPayment({
    amount: 49900,
    razorpay_payment_id: "pay_batch_2",
  });
  runMatchingEngine(pay2.id);

  console.log("Before Batch Resolution:");
  console.log("Payment 1 status:", getPaymentById(pay1.id)?.status, "confidence:", getPaymentById(pay1.id)?.confidence);
  console.log("Payment 2 status:", getPaymentById(pay2.id)?.status, "confidence:", getPaymentById(pay2.id)?.confidence);

  // Run Joint Assignment Optimization
  console.log("\nRunning solveBipartiteAssignment & runBatchResolution()...");
  const result = runBatchResolution();
  console.log("Batch Resolution Result:", JSON.stringify(result, null, 2));

  console.log("\nAfter Batch Resolution:");
  const resolvedPay1 = getPaymentById(pay1.id)!;
  const resolvedPay2 = getPaymentById(pay2.id)!;

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
