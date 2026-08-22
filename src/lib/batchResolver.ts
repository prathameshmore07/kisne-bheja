import {
  getAllPayments,
  getPendingOrders,
  getPaymentById,
  getOrderById,
  resolvePayment,
  addAudit,
  appendEvidence,
} from "./repo";
import { getAllCandidateScores, addEvidenceAndRecompute } from "./scorer";
import { Payment, Order } from "./types";

export interface BatchAssignmentPair {
  payment_id: string;
  order_id: string;
  order_name: string;
  payment_amount: number;
  initial_confidence: number;
  final_confidence: number;
  reasoning: string;
}

export interface BatchResolutionResult {
  clusters_evaluated: number;
  pairs_resolved: BatchAssignmentPair[];
  unresolved_remaining: number;
}

// Computes the optimal 1-to-1 assignment maximizing total weight (Hungarian / Maximum Weight Matching)
function solveBipartiteAssignment(
  payments: Payment[],
  orders: Order[],
  scoreMatrix: number[][]
): { assignments: Array<{ paymentIdx: number; orderIdx: number; score: number }>; totalScore: number } {
  const n = payments.length;
  const m = orders.length;
  if (n === 0 || m === 0) return { assignments: [], totalScore: 0 };

  // For small n (typical collision clusters 2-8), find the maximum weight 1-to-1 matching
  let bestScore = -1;
  let bestMatching: Array<{ paymentIdx: number; orderIdx: number; score: number }> = [];

  function permute(paymentIdx: number, usedOrders: Set<number>, currentMatching: Array<{ paymentIdx: number; orderIdx: number; score: number }>, currentScore: number) {
    if (paymentIdx === n) {
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestMatching = [...currentMatching];
      }
      return;
    }

    // Try assigning paymentIdx to any available orderIdx
    for (let j = 0; j < m; j++) {
      if (!usedOrders.has(j)) {
        usedOrders.add(j);
        const edgeScore = scoreMatrix[paymentIdx][j];
        currentMatching.push({ paymentIdx, orderIdx: j, score: edgeScore });
        permute(paymentIdx + 1, usedOrders, currentMatching, currentScore + edgeScore);
        currentMatching.pop();
        usedOrders.delete(j);
      }
    }

    // Also allow leaving this payment unassigned if n > m
    if (n > m) {
      permute(paymentIdx + 1, usedOrders, currentMatching, currentScore);
    }
  }

  permute(0, new Set(), [], 0);
  return { assignments: bestMatching, totalScore: bestScore };
}

export function runBatchResolution(): BatchResolutionResult {
  const allPayments = getAllPayments().filter(
    (p) => p.status === "unresolved" || p.status === "ambiguous"
  );
  const pendingOrders = getPendingOrders();

  const resolvedPairs: BatchAssignmentPair[] = [];

  // Group by exact amount (collision clusters)
  const amountGroups = new Map<number, { payments: Payment[]; orders: Order[] }>();

  for (const p of allPayments) {
    if (!amountGroups.has(p.amount)) {
      amountGroups.set(p.amount, { payments: [], orders: [] });
    }
    amountGroups.get(p.amount)!.payments.push(p);
  }

  for (const o of pendingOrders) {
    if (amountGroups.has(o.amount)) {
      amountGroups.get(o.amount)!.orders.push(o);
    }
  }

  let clustersEvaluated = 0;

  for (const [amount, group] of amountGroups.entries()) {
    const { payments, orders } = group;

    // Only multi-payment or multi-order clusters benefit from joint assignment optimization
    if (payments.length < 1 || orders.length < 1) continue;
    clustersEvaluated++;

    // Build the score matrix
    const scoreMatrix: number[][] = [];
    for (let i = 0; i < payments.length; i++) {
      const p = payments[i];
      const candidateScores = getAllCandidateScores(p.id);
      const row: number[] = [];

      for (let j = 0; j < orders.length; j++) {
        const o = orders[j];
        const match = candidateScores.find((c) => c.candidate_order_id === o.id);
        row.push(match ? match.confidence : 0);
      }
      scoreMatrix.push(row);
    }

    // Solve optimal bipartite assignment
    const { assignments } = solveBipartiteAssignment(payments, orders, scoreMatrix);

    for (const match of assignments) {
      const payment = payments[match.paymentIdx];
      const order = orders[match.orderIdx];
      const baseConfidence = match.score;

      // When 2+ payments and 2+ orders match simultaneously in a joint assignment,
      // the mutual exclusion resolves collision ambiguity (Pigeonhole principle boost)
      const isJointDisambiguation = payments.length >= 2 && orders.length >= 2;
      const jointBoost = isJointDisambiguation ? 0.35 : 0.0;
      const finalConfidence = Math.min(1.0, baseConfidence + jointBoost);

      if (finalConfidence >= 0.85) {
        // Record joint assignment evidence
        const detail = isJointDisambiguation
          ? `Joint assignment optimal 1-to-1 match among ${payments.length} colliding ₹${(amount / 100).toFixed(2)} payments`
          : `Batch resolution 1-to-1 match (confidence ${Math.round(finalConfidence * 100)}%)`;

        appendEvidence({
          payment_id: payment.id,
          candidate_order_id: order.id,
          signal_type: "batch_assignment",
          signal_weight: jointBoost,
          detail,
          confidence_after: finalConfidence,
        });

        // Resolve in DB
        resolvePayment(payment.id, order.id, finalConfidence);

        // Audit log
        addAudit({
          payment_id: payment.id,
          action: "batch_assignment",
          actor: "system",
          detail: `Auto-resolved via joint assignment to "${order.product_name}" (${Math.round(finalConfidence * 100)}% confidence)`,
        });

        resolvedPairs.push({
          payment_id: payment.id,
          order_id: order.id,
          order_name: order.product_name,
          payment_amount: payment.amount,
          initial_confidence: baseConfidence,
          final_confidence: finalConfidence,
          reasoning: detail,
        });
      }
    }
  }

  const remaining = getAllPayments().filter(
    (p) => p.status === "unresolved" || p.status === "ambiguous"
  ).length;

  return {
    clusters_evaluated: clustersEvaluated,
    pairs_resolved: resolvedPairs,
    unresolved_remaining: remaining,
  };
}
