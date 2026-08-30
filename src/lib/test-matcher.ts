/**
 * UNIT TEST: Orchestrated Matching Engine
 * 
 * Purpose: Tests end-to-end multi-signal evidence orchestration, collision handling,
 * and zero-candidate safety guard in isolation.
 */
import { createPayment, getEvidenceForPayment, clearAllData } from "./repo";
import { runMatchingEngine } from "./matcher";
import { hashPayerIdentity } from "./hash";
import { seedDatabase } from "./seed";

async function run() {
  console.log("=== Running isolated test: test-matcher ===");
  await clearAllData();
  await seedDatabase();

  // Case 1: ambiguous demo pair — payer matches Priya (Blue Kurta via card last4 1111 + Visa)
  const p1 = await createPayment({
    amount: 49900,
    payer_identity_hash: hashPayerIdentity("1111_visa"),
    payment_method: "card",
    payer_card_last4: "1111",
    payer_card_network: "Visa",
  });
  const r1 = await runMatchingEngine(p1.id);
  console.log("CASE 1 (should favor Blue Kurta): action =", r1.action, "best =", r1.best?.order?.product_name);
  const ev1 = await getEvidenceForPayment(p1.id);
  console.log(
    "Evidence trail:",
    ev1.map((e) => `${e.signal_type}(${e.signal_weight}) -> ${(e.confidence_after * 100).toFixed(0)}%`)
  );

  // Case 2: no matching amount at all -> manual review
  const p2 = await createPayment({ amount: 999999 });
  const r2 = await runMatchingEngine(p2.id);
  console.log("CASE 2 (unmatched amount -> manual_review): action =", r2.action);

  // Case 3: unique amount, no ambiguity -> should resolve high confidence
  const p3 = await createPayment({ amount: 79900 }); // Yoga Mat, no collision
  const r3 = await runMatchingEngine(p3.id);
  console.log("CASE 3 (Yoga Mat, unique amount): action =", r3.action, "best =", r3.best?.order?.product_name);

  console.log("✅ test-matcher completed successfully.\n");
}

run().catch(console.error);
