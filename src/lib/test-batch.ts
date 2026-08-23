import { createPayment, getPaymentById, getOrderById } from "./repo";
import { runMatchingEngine } from "./matcher";
import { resolveBatchesForPendingAmbiguity } from "./batchResolver";

async function main() {
  const paymentA = await createPayment({ amount: 49900 });
  const paymentB = await createPayment({ amount: 49900 });

  await runMatchingEngine(paymentA.id);
  await runMatchingEngine(paymentB.id);

  console.log("Before batch resolve:");
  console.log("A best guess status:", (await getPaymentById(paymentA.id))?.status);
  console.log("B best guess status:", (await getPaymentById(paymentB.id))?.status);

  const result = await resolveBatchesForPendingAmbiguity();
  console.log("\nBatch result:", result);

  const finalA = (await getPaymentById(paymentA.id))!;
  const finalB = (await getPaymentById(paymentB.id))!;
  const orderA = finalA.resolved_order_id ? (await getOrderById(finalA.resolved_order_id))?.product_name : "unresolved";
  const orderB = finalB.resolved_order_id ? (await getOrderById(finalB.resolved_order_id))?.product_name : "unresolved";

  console.log(`\nPayment A -> ${orderA}`);
  console.log(`Payment B -> ${orderB}`);
  console.log(orderA !== orderB ? "PASS: distinct orders assigned" : "FAIL: same order assigned to both");
}

main().catch(console.error);
