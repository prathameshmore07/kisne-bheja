import { createPayment, getPaymentById, getOrderById } from "./repo";
import { runMatchingEngine } from "./matcher";
import { resolveBatchesForPendingAmbiguity } from "./batchResolver";

async function main() {
  // Two ₹499 payments, no distinguishing payer info — with only individual
  // scoring, both would independently point at whichever candidate (Blue or
  // Red Kurta) scores marginally higher, with nothing stopping a collision.
  const paymentA = createPayment({ amount: 49900 });
  const paymentB = createPayment({ amount: 49900 });

  runMatchingEngine(paymentA.id);
  runMatchingEngine(paymentB.id);

  console.log("Before batch resolve:");
  console.log("A best guess status:", getPaymentById(paymentA.id)?.status);
  console.log("B best guess status:", getPaymentById(paymentB.id)?.status);

  const result = resolveBatchesForPendingAmbiguity();
  console.log("\nBatch result:", result);

  const finalA = getPaymentById(paymentA.id)!;
  const finalB = getPaymentById(paymentB.id)!;
  const orderA = finalA.resolved_order_id ? getOrderById(finalA.resolved_order_id)?.product_name : "unresolved";
  const orderB = finalB.resolved_order_id ? getOrderById(finalB.resolved_order_id)?.product_name : "unresolved";

  console.log(`\nPayment A -> ${orderA}`);
  console.log(`Payment B -> ${orderB}`);
  console.log(orderA !== orderB ? "PASS: distinct orders assigned" : "FAIL: same order assigned to both");
}

main();
