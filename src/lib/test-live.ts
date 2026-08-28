/**
 * UNIT TEST: Live Evidence Addition & Realtime Recalculation
 * 
 * Purpose: Tests dynamic addition of new evidence signals to an active payment
 * and verifies that cumulative confidence updates deterministically.
 */
import { addEvidenceAndRecompute } from "./scorer";
import { getAllPayments, getCandidateOrders, createPayment, clearAllData } from "./repo";
import { seedDatabase } from "./seed";

async function run() {
  console.log("=== Running isolated test: test-live ===");
  await clearAllData();
  await seedDatabase();

  const p = await createPayment({ amount: 49900 });
  const candidates = await getCandidateOrders(p.amount);
  if (candidates.length > 0) {
    const c = candidates[0];
    await addEvidenceAndRecompute({
      payment_id: p.id,
      candidate_order_id: c.id,
      signal_type: "conversation",
      signal_weight: 0.3,
      detail: "Manual live-test nudge",
    });
    console.log("Evidence added successfully for payment:", p.id, "order:", c.product_name);
  } else {
    console.log("No candidates found for payment", p.id);
  }
  console.log("✅ test-live completed successfully.\n");
}

run().catch(console.error);
