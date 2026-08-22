import {
  getAuditForPayment,
  getEvidenceForPayment,
  getChatForPayment,
  getOrderById,
  addAudit,
} from "./repo";
import { AuditEntry, EvidenceEntry, ChatMessage, AuditAction, AuditActor } from "./types";

export interface TimelineItem {
  id: string;
  type: "audit" | "evidence" | "chat";
  timestamp: number;
  timeStr: string;
  actor: string;
  action?: string;
  title: string;
  detail: string;
  confidenceAfter?: number;
  signalWeight?: number;
  candidateOrderId?: string;
  candidateProductName?: string;
  raw: AuditEntry | EvidenceEntry | ChatMessage;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toISOString().substring(11, 23); // HH:mm:ss.sss
}

export function getTimelineForPayment(paymentId: string): TimelineItem[] {
  const audits = getAuditForPayment(paymentId);
  const evidence = getEvidenceForPayment(paymentId);
  const chats = getChatForPayment(paymentId);

  const items: TimelineItem[] = [];

  for (const a of audits) {
    items.push({
      id: `audit-${a.id}`,
      type: "audit",
      timestamp: a.created_at,
      timeStr: formatTime(a.created_at),
      actor: a.actor,
      action: a.action,
      title: a.action.replace(/_/g, " ").toUpperCase(),
      detail: a.detail ?? "",
      raw: a,
    });
  }

  for (const e of evidence) {
    const order = getOrderById(e.candidate_order_id);
    const prodName = order?.product_name ?? e.candidate_order_id;
    items.push({
      id: `evidence-${e.id}`,
      type: "evidence",
      timestamp: e.created_at,
      timeStr: formatTime(e.created_at),
      actor: "system",
      action: e.signal_type,
      title: `EVIDENCE [${e.signal_type}] ${prodName}`,
      detail: `${e.detail ?? ""} -> ${(e.confidence_after * 100).toFixed(0)}% confidence`,
      confidenceAfter: e.confidence_after,
      signalWeight: e.signal_weight,
      candidateOrderId: e.candidate_order_id,
      candidateProductName: prodName,
      raw: e,
    });
  }

  for (const c of chats) {
    items.push({
      id: `chat-${c.id}`,
      type: "chat",
      timestamp: c.created_at,
      timeStr: formatTime(c.created_at),
      actor: c.sender === "merchant_system" ? "system" : "customer",
      action: "simulated_chat",
      title: `CHAT [${c.sender}]`,
      detail: c.message,
      raw: c,
    });
  }

  // Sort chronologically by timestamp, tiebreak by id
  return items.sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    return a.id.localeCompare(b.id);
  });
}

export function formatTimelineForConsole(paymentId: string): string {
  const timeline = getTimelineForPayment(paymentId);
  if (timeline.length === 0) {
    return "(No timeline events recorded)";
  }

  return timeline
    .map((item) => {
      const actorTag = `[${item.actor.toUpperCase()}]`.padEnd(10, " ");
      return `[${item.timeStr}] ${actorTag} ${item.title}: ${item.detail}`;
    })
    .join("\n");
}

// Helpers for merchant audit logging
export function logMerchantApproval(paymentId: string, orderId: string, merchantName = "merchant") {
  const order = getOrderById(orderId);
  addAudit({
    payment_id: paymentId,
    action: "approved",
    actor: "merchant",
    detail: `Merchant approved resolution to order "${order?.product_name ?? orderId}"`,
  });
}

export function logMerchantRejection(paymentId: string, reason?: string, merchantName = "merchant") {
  addAudit({
    payment_id: paymentId,
    action: "rejected",
    actor: "merchant",
    detail: reason ? `Merchant rejected match: ${reason}` : "Merchant rejected candidate match",
  });
}

export function logMerchantUnlink(paymentId: string, reason?: string, merchantName = "merchant") {
  addAudit({
    payment_id: paymentId,
    action: "unlinked",
    actor: "merchant",
    detail: reason ? `Merchant unlinked payment: ${reason}` : "Merchant unlinked payment from order",
  });
}
