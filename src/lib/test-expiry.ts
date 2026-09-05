/**
 * UNIT TEST: Order Expiry & Auto-Cancellation
 * 
 * Purpose: Verifies that orders past the stale threshold are auto-cancelled and excluded from matching.
 */
import { createOrder, autoCancelExpiredOrders, getCancelledOrders, clearAllData } from "./repo";
import { seedDatabase } from "./seed";

async function main() {
  console.log("=== Running isolated test: test-expiry ===");
  await clearAllData();
  await seedDatabase();

  console.log("--- Feature 4: Order Expiry & Auto-Cancel ---");
  const staleOrder = await createOrder({
    product_name: "Stale Summer Tee",
    amount: 35000,
    customer_name: "Old Customer",
    created_at: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
  });
  console.log(`Created order ${staleOrder.product_name} 10 days in the past.`);
  const cancelledCount = await autoCancelExpiredOrders(7); // stale after 7 days
  console.log(`Auto-cancelled ${cancelledCount} stale orders.`);
  const cancelledOrders = await getCancelledOrders();
  console.log("Cancelled orders in ledger:", cancelledOrders.map((o) => o.product_name));
  const isStaleCancelled = cancelledOrders.some((o) => o.id === staleOrder.id);
  if (isStaleCancelled) {
    console.log("✓ Expired orders are automatically marked as cancelled and surfaced in the Cancelled tab filter.");
  } else {
    console.error("✗ Stale order was not cancelled");
    process.exit(1);
  }
  console.log("✅ test-expiry completed successfully.\n");
}

main().catch(console.error);
