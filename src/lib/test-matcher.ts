import { createPayment } from "./repo";
import { runMatchingEngine } from "./matcher";
import { getEvidenceForPayment } from "./repo";

// Case 1: ambiguous demo pair — payer matches Priya (Blue Kurta)
const p1 = createPayment({ amount: 49900, payer_vpa_hash: "vpa_hash_priya_001" });
const r1 = runMatchingEngine(p1.id);
console.log("CASE 1 (should favor Blue Kurta):", r1);
console.log(
  "Evidence trail:",
  getEvidenceForPayment(p1.id).map(
    (e) => `${e.signal_type}(${e.signal_weight}) -> ${(e.confidence_after * 100).toFixed(0)}%`
  )
);

// Case 2: no matching amount at all -> manual review
const p2 = createPayment({ amount: 123456 });
const r2 = runMatchingEngine(p2.id);
console.log("CASE 2 (should be manual_review):", r2);

// Case 3: unique amount, no ambiguity -> should resolve high confidence
const p3 = createPayment({ amount: 79900 }); // Yoga Mat, no collision
const r3 = runMatchingEngine(p3.id);
console.log("CASE 3 (Yoga Mat, unique amount):", r3);
