/**
 * UNIT TEST: Payment Velocity Anomaly Detection
 * 
 * Purpose: Verifies detection of high-volume payment spikes for identical amounts within short windows.
 */
import { createPayment, checkPaymentVelocity, clearAllData } from "./repo";
import { seedDatabase } from "./seed";

async function main() {
  console.log("=== Running isolated test: test-velocity ===");
  await clearAllData();
  await seedDatabase();

  console.log("--- Feature 5: Payment Velocity Anomaly Flag ---");
  await createPayment({ amount: 49900 });
  await createPayment({ amount: 49900 });
  await createPayment({ amount: 49900 });
  const velocity = await checkPaymentVelocity(49900, 60);
  console.log(`Payment velocity for ₹499 in last 1 hour: ${velocity.count} payments (spike: ${velocity.is_spike})`);
  if (velocity.is_spike) {
    console.log("✓ High volume velocity anomaly correctly detected and flagged for merchant attention.");
  } else {
    console.error("✗ Velocity anomaly not detected");
    process.exit(1);
  }
  console.log("✅ test-velocity completed successfully.\n");
}

main().catch(console.error);
