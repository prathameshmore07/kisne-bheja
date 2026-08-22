import {
  getAllPayments,
  getPendingOrders,
  getPaymentById,
  getOrderById,
  resolvePayment,
  addAudit,
  appendEvidence,
} from "./repo";
import { getAllCandidateScores } from "./scorer";
import { Payment, Order } from "./types";

export interface BatchAssignmentResult {
  groupsProcessed: number;
  resolvedCount: number;
  assignments: Array<{
    payment_id: string;
    order_id: string;
    product_name: string;
    confidence: number;
  }>;
}

export function resolveBatchesForPendingAmbiguity(): BatchAssignmentResult {
  const unresolvedPayments = getAllPayments().filter(
    (p) => p.status === "unresolved" || p.status === "ambiguous"
  );

  // Group unresolved payments by amount
  const paymentsByAmount = new Map<number, Payment[]>();
  for (const p of unresolvedPayments) {
    if (!paymentsByAmount.has(p.amount)) {
      paymentsByAmount.set(p.amount, []);
    }
    paymentsByAmount.get(p.amount)!.push(p);
  }

  let groupsProcessed = 0;
  const assignmentsMade: Array<{
    payment_id: string;
    order_id: string;
    product_name: string;
    confidence: number;
  }> = [];

  for (const [amount, payments] of paymentsByAmount.entries()) {
    // Joint assignment triggers when 2+ payments share an amount
    if (payments.length < 2) continue;

    groupsProcessed++;

    // Collect all candidate scores for all payments in this group
    interface CandidatePair {
      payment: Payment;
      order_id: string;
      order_name: string;
      confidence: number;
    }

    const allPairs: CandidatePair[] = [];

    for (const payment of payments) {
      const candidates = getAllCandidateScores(payment.id);
      for (const cand of candidates) {
        if (cand.order && cand.order.status === "pending") {
          allPairs.push({
            payment,
            order_id: cand.candidate_order_id,
            order_name: cand.order.product_name,
            confidence: cand.confidence,
          });
        }
      }
    }

    // Sort greedily by confidence descending (Hungarian approximation)
    allPairs.sort((a, b) => b.confidence - a.confidence);

    const assignedPayments = new Set<string>();
    const assignedOrders = new Set<string>();

    for (const pair of allPairs) {
      if (
        !assignedPayments.has(pair.payment.id) &&
        !assignedOrders.has(pair.order_id)
      ) {
        assignedPayments.add(pair.payment.id);
        assignedOrders.add(pair.order_id);

        // Apply mutual exclusion assignment boost (pigeonhole principle)
        const boost = 0.35;
        const finalConfidence = Math.min(1.0, pair.confidence + boost);

        // Append evidence entry to ledger
        appendEvidence({
          payment_id: pair.payment.id,
          candidate_order_id: pair.order_id,
          signal_type: "batch_assignment",
          signal_weight: boost,
          detail: `Joint assignment: Mutually exclusive 1-to-1 matching among ${payments.length} simultaneous ₹${(amount / 100).toFixed(2)} payments`,
          confidence_after: finalConfidence,
        });

        // Resolve in DB
        resolvePayment(pair.payment.id, pair.order_id, finalConfidence);

        // Add audit trail entry
        addAudit({
          payment_id: pair.payment.id,
          action: "batch_resolved",
          actor: "system",
          detail: `Batch-resolved via joint assignment to "${pair.order_name}" (${Math.round(finalConfidence * 100)}% confidence)`,
        });

        assignmentsMade.push({
          payment_id: pair.payment.id,
          order_id: pair.order_id,
          product_name: pair.order_name,
          confidence: finalConfidence,
        });
      }
    }
  }

  return {
    groupsProcessed,
    resolvedCount: assignmentsMade.length,
    assignments: assignmentsMade,
  };
}

// Alias for backward compatibility if needed
export const runBatchResolution = resolveBatchesForPendingAmbiguity;
