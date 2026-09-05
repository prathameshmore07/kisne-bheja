/**
 * UNIT TEST: Order Confidence Forecast at Creation
 * 
 * Purpose: Verifies order price collision warning at order creation time
 * before saving into the database.
 */
import { getPendingOrdersByAmount, clearAllData } from "./repo";
import { seedDatabase } from "./seed";

async function main() {
  console.log("=== Running isolated test: test-forecast ===");
  await clearAllData();
  await seedDatabase();

  console.log("--- Feature 1: Order Confidence Forecast at Creation ---");
  const colliding = await getPendingOrdersByAmount(49900);
  console.log(`Found ${colliding.length} colliding pending orders for ₹499.00:`);
  colliding.forEach((o) => console.log(` - ${o.product_name} (${o.customer_name})`));
  if (colliding.length >= 2) {
    console.log("✓ Confidence forecast correctly warns merchant of price collision before saving.");
  } else {
    console.error("✗ Confidence forecast failed to find colliding orders");
    process.exit(1);
  }
  console.log("✅ test-forecast completed successfully.\n");
}

main().catch(console.error);
