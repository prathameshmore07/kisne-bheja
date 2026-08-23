import { createPayment, getEvidenceForPayment } from "./repo";
import { runMatchingEngine } from "./matcher";
import { hashVpa } from "./hash";
import { seedDatabase } from "./seed";

async function run() {
  await seedDatabase();
  // Case 1: ambiguous demo pair — payer matches Priya (Blue Kurta)
  const p1 = await createPayment({ amount: 49900, payer_vpa_hash: hashVpa("priya.sharma@okhdfcbank") });
  const r1 = await runMatchingEngine(p1.id);
  console.log("CASE 1 (should favor Blue Kurta):", r1);
  const ev1 = await getEvidenceForPayment(p1.id);
  console.log(
    "Evidence trail:",
    ev1.map((e) => `${e.signal_type}(${e.signal_weight}) -> ${(e.confidence_after * 100).toFixed(0)}%`)
  );

  // Case 2: no matching amount at all -> manual review
  const p2 = await createPayment({ amount: 999999 });
  const r2 = await runMatchingEngine(p2.id);
  console.log("CASE 2 (should be manual_review):", r2);

  // Case 3: unique amount, no ambiguity -> should resolve high confidence
  const p3 = await createPayment({ amount: 79900 }); // Yoga Mat, no collision
  const r3 = await runMatchingEngine(p3.id);
  console.log("CASE 3 (Yoga Mat, unique amount):", r3);
}

run().catch(console.error);
