import {
  getPaymentById,
  getOrderById,
  resolvePayment,
  unlinkPayment,
  updatePaymentConfidence,
  addAudit,
} from "./repo";
import { getBestCandidate, addEvidenceAndRecompute } from "./scorer";

export function approvePayment(paymentId: string, orderId?: string) {
  const payment = getPaymentById(paymentId);
  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  const targetOrderId = orderId ?? getBestCandidate(paymentId)?.candidate_order_id;
  if (!targetOrderId) {
    throw new Error("No candidate order specified to approve");
  }

  const order = getOrderById(targetOrderId);
  if (!order) {
    throw new Error(`Order ${targetOrderId} not found`);
  }

  resolvePayment(paymentId, targetOrderId, 1.0);

  addAudit({
    payment_id: paymentId,
    action: "approved",
    actor: "merchant",
    detail: `Merchant manually approved match to "${order.product_name}" (₹${(
      order.amount / 100
    ).toFixed(2)})`,
  });

  return { status: "approved", paymentId, orderId: targetOrderId };
}

export function rejectPayment(paymentId: string, orderId: string) {
  const payment = getPaymentById(paymentId);
  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  const order = getOrderById(orderId);
  const orderName = order ? order.product_name : orderId;

  // Add strong negative evidence signal (-100%) so this candidate is ruled out
  addEvidenceAndRecompute({
    payment_id: paymentId,
    candidate_order_id: orderId,
    signal_type: "negative",
    signal_weight: -1.0,
    detail: `Merchant marked "${orderName}" as incorrect match (-100%)`,
  });

  addAudit({
    payment_id: paymentId,
    action: "rejected",
    actor: "merchant",
    detail: `Merchant rejected candidate "${orderName}"`,
  });

  // Re-check best candidate after rejection
  const best = getBestCandidate(paymentId);
  if (!best || best.confidence <= 0) {
    updatePaymentConfidence(paymentId, 0, "manual_review");
  } else {
    updatePaymentConfidence(paymentId, best.confidence, payment.status);
  }

  return { status: "rejected", paymentId, orderId };
}

export function unlinkPaymentAction(paymentId: string) {
  const payment = getPaymentById(paymentId);
  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  if (!payment.resolved_order_id) {
    throw new Error(`Payment ${paymentId} is not resolved`);
  }

  const prevOrderId = payment.resolved_order_id;
  const order = getOrderById(prevOrderId);
  const orderName = order ? order.product_name : prevOrderId;

  // Unlink in DB (restores order to pending, clears payment resolution)
  unlinkPayment(paymentId);

  // Add negative evidence against the mistakenly linked candidate
  addEvidenceAndRecompute({
    payment_id: paymentId,
    candidate_order_id: prevOrderId,
    signal_type: "negative",
    signal_weight: -1.0,
    detail: `Merchant unlinked previous match — marked "${orderName}" as wrong match`,
  });

  addAudit({
    payment_id: paymentId,
    action: "unlinked",
    actor: "merchant",
    detail: `Merchant unlinked match with "${orderName}" and returned payment to unresolved`,
  });

  const best = getBestCandidate(paymentId);
  if (best && best.confidence > 0) {
    updatePaymentConfidence(paymentId, best.confidence, "ambiguous");
  } else {
    updatePaymentConfidence(paymentId, 0, "unresolved");
  }

  return { status: "unlinked", paymentId };
}