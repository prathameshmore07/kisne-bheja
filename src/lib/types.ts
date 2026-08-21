export type OrderStatus = "pending" | "resolved" | "cancelled";
export type PaymentStatus = "unresolved" | "ambiguous" | "resolved" | "manual_review";
export type SignalType =
  | "amount_match"
  | "timing"
  | "payer_history"
  | "order_age"
  | "link_metadata"
  | "conversation"
  | "negative"
  | "partial";
export type AuditActor = "system" | "gemini" | "merchant";
export type AuditAction =
  | "webhook_received"
  | "evidence_added"
  | "clarification_sent"
  | "reply_interpreted"
  | "auto_resolved"
  | "approved"
  | "rejected"
  | "unlinked"
  | "manual_review";

export interface Order {
  id: string;
  product_name: string;
  amount: number; // paise
  customer_name: string | null;
  customer_vpa_hash: string | null;
  status: OrderStatus;
  created_at: number;
}

export interface Payment {
  id: string;
  razorpay_payment_id: string | null;
  razorpay_payment_link_id: string | null;
  amount: number; // paise
  payer_vpa_hash: string | null;
  status: PaymentStatus;
  resolved_order_id: string | null;
  confidence: number; // 0..1
  received_at: number;
  resolved_at: number | null;
}

export interface EvidenceEntry {
  id: number;
  payment_id: string;
  candidate_order_id: string;
  signal_type: SignalType;
  signal_weight: number;
  detail: string | null;
  confidence_after: number;
  created_at: number;
}

export interface AuditEntry {
  id: number;
  payment_id: string | null;
  action: AuditAction;
  actor: AuditActor;
  detail: string | null;
  created_at: number;
}

export interface ChatMessage {
  id: number;
  payment_id: string;
  sender: "merchant_system" | "customer";
  message: string;
  created_at: number;
}
