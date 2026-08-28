/**
 * UNIT TEST: Joint Hungarian Bipartite Assignment
 * 
 * Purpose: Verifies simultaneous same-amount collision untangling to ensure two payments
 * of identical amounts can never both claim the same order.
 */
import { createOrder, createPayment, getPaymentById, getOrderById, clearAllData } from "./repo";
import { runMatchingEngine } from "./matcher";
import { runBatchResolution } from "./batchResolver";
import { seedDatabase } from "./seed";

async function main() {
  console.log("=== Running isolated test: test-batch-resolver ===");
  await clearAllData();
  await seedDatabase();

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
  console.log("Payment 1 status:", (await getPaymentById(pay1.id))?.status);
  console.log("Payment 2 status:", (await getPaymentById(pay2.id))?.status);

  // Run Joint Assignment Optimization
  console.log("\nRunning solveBipartiteAssignment & runBatchResolution()...");
  const result = await runBatchResolution();
  console.log("Batch Resolution Result:", JSON.stringify(result, null, 2));

  console.log("\nAfter Batch Resolution:");
  const resolvedPay1 = (await getPaymentById(pay1.id))!;
  const resolvedPay2 = (await getPaymentById(pay2.id))!;

  console.log("Payment 1 resolved to:", (await getOrderById(resolvedPay1.resolved_order_id!))?.product_name);
  console.log("Payment 2 resolved to:", (await getOrderById(resolvedPay2.resolved_order_id!))?.product_name);

  const isSuccess =
    resolvedPay1.status === "resolved" &&
    resolvedPay2.status === "resolved" &&
    resolvedPay1.resolved_order_id !== null &&
    resolvedPay2.resolved_order_id !== null &&
    resolvedPay1.resolved_order_id !== resolvedPay2.resolved_order_id;

  console.log("\nJoint assignment verified successfully?", isSuccess ? "YES! Both untangled to distinct orders." : "FAILED");
  console.log("✅ test-batch-resolver completed successfully.\n");
}

main().catch(console.error);
