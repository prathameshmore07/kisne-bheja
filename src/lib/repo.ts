import db from "./db";
import { randomUUID } from "crypto";
import {
  Order,
  Payment,
  EvidenceEntry,
  AuditEntry,
  ChatMessage,
  SignalType,
  AuditAction,
  AuditActor,
  PaymentStatus,
} from "./types";

// ---------- ORDERS ----------

export function createOrder(input: {
  product_name: string;
  amount: number;
  customer_name?: string;
  customer_vpa_hash?: string;
}): Order {
  const id = randomUUID();
  const created_at = Date.now();
  db.prepare(`
    INSERT INTO orders (id, product_name, amount, customer_name, customer_vpa_hash, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    id,
    input.product_name,
    input.amount,
    input.customer_name ?? null,
    input.customer_vpa_hash ?? null,
    created_at
  );
  return {
    id,
    product_name: input.product_name,
    amount: input.amount,
    customer_name: input.customer_name ?? null,
    customer_vpa_hash: input.customer_vpa_hash ?? null,
    status: "pending",
    created_at,
  };
}

export function getPendingOrders(): Order[] {
  return db.prepare(`SELECT * FROM orders WHERE status = 'pending'`).all() as Order[];
}

export function getOrderById(id: string): Order | undefined {
  return db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as Order | undefined;
}

export function markOrderResolved(id: string) {
  db.prepare(`UPDATE orders SET status = 'resolved' WHERE id = ?`).run(id);
}

export function markOrderPending(id: string) {
  db.prepare(`UPDATE orders SET status = 'pending' WHERE id = ?`).run(id);
}

// candidates: pending orders whose amount could plausibly match this payment
// (exact match OR partial — partial handling refined in scoring engine, step 4)
export function getCandidateOrders(paymentAmount: number): Order[] {
  return db
    .prepare(`SELECT * FROM orders WHERE status = 'pending' AND amount <= ? ORDER BY created_at DESC`)
    .all(paymentAmount * 1.05) as Order[]; // small headroom for partial-payment edge case later
}

// ---------- PAYMENTS ----------

export function createPayment(input: {
  razorpay_payment_id?: string;
  razorpay_payment_link_id?: string;
  amount: number;
  payer_vpa_hash?: string;
}): Payment {
  const id = randomUUID();
  const received_at = Date.now();
  db.prepare(`
    INSERT INTO payments (id, razorpay_payment_id, razorpay_payment_link_id, amount, payer_vpa_hash, status, confidence, received_at)
    VALUES (?, ?, ?, ?, ?, 'unresolved', 0, ?)
  `).run(
    id,
    input.razorpay_payment_id ?? null,
    input.razorpay_payment_link_id ?? null,
    input.amount,
    input.payer_vpa_hash ?? null,
    received_at
  );
  return getPaymentById(id)!;
}

export function createPaymentFromWebhook(input: {
  razorpay_payment_id: string;
  razorpay_payment_link_id?: string;
  amount: number;
  payer_vpa_hash?: string;
}): Payment {
  const payment = createPayment(input);
  addAudit({
    payment_id: payment.id,
    action: "webhook_received",
    actor: "system",
    detail: `Razorpay payment ${input.razorpay_payment_id} received — ₹${(input.amount / 100).toFixed(2)}`,
  });
  return payment;
}

export function getPaymentById(id: string): Payment | undefined {
  return db.prepare(`SELECT * FROM payments WHERE id = ?`).get(id) as Payment | undefined;
}

export function getPaymentByRazorpayId(razorpayPaymentId: string): Payment | undefined {
  return db
    .prepare(`SELECT * FROM payments WHERE razorpay_payment_id = ?`)
    .get(razorpayPaymentId) as Payment | undefined;
}

export function getAllPayments(): Payment[] {
  return db.prepare(`SELECT * FROM payments ORDER BY received_at DESC`).all() as Payment[];
}

export function updatePaymentConfidence(id: string, confidence: number, status: PaymentStatus) {
  db.prepare(`UPDATE payments SET confidence = ?, status = ? WHERE id = ?`).run(confidence, status, id);
}

export function resolvePayment(paymentId: string, orderId: string, confidence: number) {
  const resolved_at = Date.now();
  db.prepare(`
    UPDATE payments SET status = 'resolved', resolved_order_id = ?, confidence = ?, resolved_at = ?
    WHERE id = ?
  `).run(orderId, confidence, resolved_at, paymentId);
  markOrderResolved(orderId);
}

export function unlinkPayment(paymentId: string) {
  const payment = getPaymentById(paymentId);
  if (payment?.resolved_order_id) {
    markOrderPending(payment.resolved_order_id);
  }
  db.prepare(`
    UPDATE payments SET status = 'unresolved', resolved_order_id = NULL, confidence = 0, resolved_at = NULL
    WHERE id = ?
  `).run(paymentId);
}

// ---------- EVIDENCE LOG (Confidence Ledger) ----------

export function appendEvidence(entry: {
  payment_id: string;
  candidate_order_id: string;
  signal_type: SignalType;
  signal_weight: number;
  detail?: string;
  confidence_after: number;
}): EvidenceEntry {
  const created_at = Date.now();
  const result = db.prepare(`
    INSERT INTO evidence_log (payment_id, candidate_order_id, signal_type, signal_weight, detail, confidence_after, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.payment_id,
    entry.candidate_order_id,
    entry.signal_type,
    entry.signal_weight,
    entry.detail ?? null,
    entry.confidence_after,
    created_at
  );
  return db.prepare(`SELECT * FROM evidence_log WHERE id = ?`).get(Number(result.lastInsertRowid)) as EvidenceEntry;
}

export function getEvidenceForPayment(paymentId: string): EvidenceEntry[] {
  return db
    .prepare(`SELECT * FROM evidence_log WHERE payment_id = ? ORDER BY created_at ASC`)
    .all(paymentId) as EvidenceEntry[];
}

// ---------- AUDIT LOG ----------

export function addAudit(entry: {
  payment_id?: string;
  action: AuditAction;
  actor: AuditActor;
  detail?: string;
}): AuditEntry {
  const created_at = Date.now();
  const result = db.prepare(`
    INSERT INTO audit_log (payment_id, action, actor, detail, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(entry.payment_id ?? null, entry.action, entry.actor, entry.detail ?? null, created_at);
  return db.prepare(`SELECT * FROM audit_log WHERE id = ?`).get(Number(result.lastInsertRowid)) as AuditEntry;
}

export function getAuditForPayment(paymentId: string): AuditEntry[] {
  return db
    .prepare(`SELECT * FROM audit_log WHERE payment_id = ? ORDER BY created_at ASC`)
    .all(paymentId) as AuditEntry[];
}

export function getAllAudit(limit = 50): AuditEntry[] {
  return db.prepare(`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?`).all(limit) as AuditEntry[];
}

// ---------- SIMULATED CHAT ----------

export function addChatMessage(paymentId: string, sender: "merchant_system" | "customer", message: string): ChatMessage {
  const created_at = Date.now();
  const result = db.prepare(`
    INSERT INTO simulated_chat (payment_id, sender, message, created_at)
    VALUES (?, ?, ?, ?)
  `).run(paymentId, sender, message, created_at);
  return db.prepare(`SELECT * FROM simulated_chat WHERE id = ?`).get(Number(result.lastInsertRowid)) as ChatMessage;
}

export function getChatForPayment(paymentId: string): ChatMessage[] {
  return db
    .prepare(`SELECT * FROM simulated_chat WHERE payment_id = ? ORDER BY created_at ASC`)
    .all(paymentId) as ChatMessage[];
}
