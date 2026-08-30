import { getSupabaseServer } from "./supabaseServer";
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

// In-memory metadata maps for card and expiry extensions (schema-independent)
const orderCardMap = new Map<string, { last4?: string; network?: string; expires_at?: number }>();
const paymentCardMap = new Map<string, { method?: "upi" | "card" | "netbanking" | "wallet"; last4?: string; network?: string }>();

// Helper to convert Postgres row with ISO timestamptz to internal model with unix ms timestamps
function mapOrder(row: any): Order {
  const meta = orderCardMap.get(row.id);
  const identityHash = row.customer_identity_hash ?? row.customer_vpa_hash ?? null;
  return {
    id: row.id,
    product_name: row.product_name,
    amount: row.amount,
    customer_name: row.customer_name ?? null,
    customer_identity_hash: identityHash,
    customer_vpa_hash: identityHash,
    customer_card_last4: meta?.last4 ?? null,
    customer_card_network: meta?.network ?? null,
    status: row.status,
    expires_at: meta?.expires_at ?? (row.expires_at ? (typeof row.expires_at === "string" ? Date.parse(row.expires_at) : row.expires_at) : null),
    created_at: typeof row.created_at === "string" ? Date.parse(row.created_at) : (row.created_at || Date.now()),
  };
}

function mapPayment(row: any): Payment {
  const meta = paymentCardMap.get(row.id);
  const identityHash = row.payer_identity_hash ?? row.payer_vpa_hash ?? null;
  return {
    id: row.id,
    razorpay_payment_id: row.razorpay_payment_id ?? null,
    razorpay_payment_link_id: row.razorpay_payment_link_id ?? null,
    amount: row.amount,
    payer_identity_hash: identityHash,
    payer_vpa_hash: identityHash,
    payment_method: meta?.method ?? (meta?.last4 ? "card" : "upi"),
    payer_card_last4: meta?.last4 ?? null,
    payer_card_network: meta?.network ?? null,
    status: row.status,
    resolved_order_id: row.resolved_order_id ?? null,
    confidence: Number(row.confidence || 0),
    is_velocity_spike: false,
    received_at: typeof row.received_at === "string" ? Date.parse(row.received_at) : (row.received_at || Date.now()),
    resolved_at: row.resolved_at ? (typeof row.resolved_at === "string" ? Date.parse(row.resolved_at) : row.resolved_at) : null,
  };
}

function mapEvidence(row: any): EvidenceEntry {
  let signal_type = row.signal_type as SignalType;
  if (row.detail?.startsWith("Merchant Rule") || row.detail?.startsWith("Merchant custom rule")) {
    signal_type = "merchant_rule";
  }
  return {
    id: Number(row.id),
    payment_id: row.payment_id,
    candidate_order_id: row.candidate_order_id,
    signal_type,
    signal_weight: Number(row.signal_weight),
    detail: row.detail ?? null,
    confidence_after: Number(row.confidence_after),
    created_at: typeof row.created_at === "string" ? Date.parse(row.created_at) : (row.created_at || Date.now()),
  };
}

function mapAudit(row: any): AuditEntry {
  return {
    id: Number(row.id),
    payment_id: row.payment_id ?? null,
    action: row.action,
    actor: row.actor,
    detail: row.detail ?? null,
    created_at: typeof row.created_at === "string" ? Date.parse(row.created_at) : (row.created_at || Date.now()),
  };
}

function mapChat(row: any): ChatMessage {
  return {
    id: Number(row.id),
    payment_id: row.payment_id,
    sender: row.sender,
    message: row.message,
    created_at: typeof row.created_at === "string" ? Date.parse(row.created_at) : (row.created_at || Date.now()),
  };
}

// ---------- ORDERS ----------

export async function createOrder(input: {
  product_name: string;
  amount: number;
  customer_name?: string;
  customer_identity_hash?: string;
  customer_vpa_hash?: string;
  customer_card_last4?: string;
  customer_card_network?: string;
  expires_at?: number;
  created_at?: number;
  is_benchmark?: boolean;
}): Promise<Order> {
  const supabase = getSupabaseServer();
  const identityHash = input.customer_identity_hash ?? input.customer_vpa_hash ?? null;
  const insertPayload: any = {
    product_name: input.product_name,
    amount: input.amount,
    customer_name: input.customer_name ?? null,
    customer_identity_hash: identityHash,
    status: "pending",
    is_benchmark: input.is_benchmark ?? false,
  };
  if (input.created_at) {
    insertPayload.created_at = new Date(input.created_at).toISOString();
  }

  let { data, error } = await supabase.from("orders").insert(insertPayload).select().single();
  // Fallback if remote schema has customer_vpa_hash
  if (error && (error.message?.includes("customer_identity_hash") || error.code === "PGRST204")) {
    delete insertPayload.customer_identity_hash;
    insertPayload.customer_vpa_hash = identityHash;
    const retry = await supabase.from("orders").insert(insertPayload).select().single();
    data = retry.data;
    error = retry.error;
  }
  if (error || !data) {
    throw new Error(`Failed to create order: ${error?.message}`);
  }
  if (input.customer_card_last4 || input.expires_at) {
    orderCardMap.set(data.id, {
      last4: input.customer_card_last4,
      network: input.customer_card_network,
      expires_at: input.expires_at,
    });
  }
  return mapOrder(data);
}

export async function getPendingOrders(): Promise<Order[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.from("orders").select("*").eq("status", "pending");
  if (error) throw new Error(`Failed to get pending orders: ${error.message}`);
  return (data || []).map(mapOrder);
}

export async function getPendingOrdersByAmount(amount: number): Promise<Order[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("status", "pending")
    .eq("amount", amount);
  if (error) return [];
  return (data || []).map(mapOrder);
}

export async function getCancelledOrders(): Promise<Order[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("status", "cancelled")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data || []).map(mapOrder);
}

export async function autoCancelExpiredOrders(staleDays: number = 7): Promise<number> {
  const supabase = getSupabaseServer();
  const cutoffMs = Date.now() - staleDays * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffMs).toISOString();

  try {
    const { data: expiredOrders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "pending")
      .lt("created_at", cutoffIso);

    if (error || !expiredOrders || expiredOrders.length === 0) {
      return 0;
    }

    for (const order of expiredOrders) {
      await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      await addAudit({
        action: "order_expired",
        actor: "system",
        detail: `Order ${order.product_name} (${order.id}) auto-cancelled after ${staleDays} days without payment`,
      });
    }

    return expiredOrders.length;
  } catch (err) {
    console.error("Error auto-cancelling expired orders:", err);
    return 0;
  }
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to get order by id: ${error.message}`);
  return data ? mapOrder(data) : undefined;
}

export async function markOrderResolved(id: string): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("orders").update({ status: "resolved" }).eq("id", id);
  if (error) throw new Error(`Failed to mark order resolved: ${error.message}`);
}

export async function markOrderPending(id: string): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("orders").update({ status: "pending" }).eq("id", id);
  if (error) throw new Error(`Failed to mark order pending: ${error.message}`);
}

export async function getCandidateOrders(paymentAmount: number): Promise<Order[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("status", "pending")
    .lte("amount", Math.round(paymentAmount * 1.05))
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to get candidate orders: ${error.message}`);
  return (data || []).map(mapOrder);
}

// ---------- PAYMENTS ----------

export async function checkPaymentVelocity(amount: number, windowMinutes: number = 60): Promise<{ count: number; is_spike: boolean }> {
  const supabase = getSupabaseServer();
  const cutoffIso = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  try {
    const { data, error } = await supabase
      .from("payments")
      .select("id, amount, received_at")
      .eq("amount", amount)
      .gte("received_at", cutoffIso);

    if (error || !data) return { count: 1, is_spike: false };
    const count = data.length;
    const is_spike = count >= 3; // 3 or more payments of exact same price in rolling hour
    return { count, is_spike };
  } catch {
    return { count: 1, is_spike: false };
  }
}

export async function createPayment(input: {
  razorpay_payment_id?: string;
  razorpay_payment_link_id?: string;
  amount: number;
  payer_identity_hash?: string;
  payer_vpa_hash?: string;
  payment_method?: "upi" | "card" | "netbanking" | "wallet";
  payer_card_last4?: string;
  payer_card_network?: string;
  is_velocity_spike?: boolean;
  velocity_count?: number;
  received_at?: number;
  is_benchmark?: boolean;
}): Promise<Payment> {
  const supabase = getSupabaseServer();
  const identityHash = input.payer_identity_hash ?? input.payer_vpa_hash ?? null;
  const insertPayload: any = {
    razorpay_payment_id: input.razorpay_payment_id ?? null,
    razorpay_payment_link_id: input.razorpay_payment_link_id ?? null,
    amount: input.amount,
    payer_identity_hash: identityHash,
    status: "unresolved",
    confidence: 0,
    is_benchmark: input.is_benchmark ?? false,
  };
  if (input.received_at) {
    insertPayload.received_at = new Date(input.received_at).toISOString();
  }

  let { data, error } = await supabase.from("payments").insert(insertPayload).select().single();
  // Fallback if remote schema has payer_vpa_hash
  if (error && (error.message?.includes("payer_identity_hash") || error.code === "PGRST204")) {
    delete insertPayload.payer_identity_hash;
    insertPayload.payer_vpa_hash = identityHash;
    const retry = await supabase.from("payments").insert(insertPayload).select().single();
    data = retry.data;
    error = retry.error;
  }
  if (error || !data) {
    throw new Error(`Failed to create payment: ${error?.message}`);
  }

  if (input.payment_method || input.payer_card_last4) {
    paymentCardMap.set(data.id, {
      method: input.payment_method,
      last4: input.payer_card_last4,
      network: input.payer_card_network,
    });
  }

  const payment = mapPayment(data);
  payment.is_velocity_spike = input.is_velocity_spike ?? false;
  payment.velocity_count = input.velocity_count;
  return payment;
}

export async function createPaymentFromWebhook(input: {
  razorpay_payment_id: string;
  razorpay_payment_link_id?: string;
  amount: number;
  payer_identity_hash?: string;
  payer_vpa_hash?: string;
  payment_method?: "upi" | "card" | "netbanking" | "wallet";
  payer_card_last4?: string;
  payer_card_network?: string;
}): Promise<Payment> {
  const velocity = await checkPaymentVelocity(input.amount, 60);
  const payment = await createPayment({
    ...input,
    is_velocity_spike: velocity.is_spike,
    velocity_count: velocity.count + 1,
  });

  await addAudit({
    payment_id: payment.id,
    action: "webhook_received",
    actor: "system",
    detail: `Razorpay payment ${input.razorpay_payment_id} received — ₹${(input.amount / 100).toFixed(2)} (${input.payment_method || "card"})${velocity.is_spike ? ` [⚠️ High velocity spike: ${velocity.count + 1} payments in 1h]` : ""}`,
  });
  return payment;
}

export async function getPaymentById(id: string): Promise<Payment | undefined> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.from("payments").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to get payment by id: ${error.message}`);
  if (!data) return undefined;

  const payment = mapPayment(data);
  const velocity = await checkPaymentVelocity(payment.amount, 60);
  payment.is_velocity_spike = velocity.is_spike;
  payment.velocity_count = velocity.count;
  return payment;
}

export async function getPaymentByRazorpayId(razorpayPaymentId: string): Promise<Payment | undefined> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("razorpay_payment_id", razorpayPaymentId)
    .maybeSingle();
  if (error) throw new Error(`Failed to get payment by razorpay id: ${error.message}`);
  return data ? mapPayment(data) : undefined;
}

export async function getAllPayments(): Promise<Payment[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("received_at", { ascending: false });
  if (error) throw new Error(`Failed to get all payments: ${error.message}`);
  
  const payments = (data || []).map(mapPayment);
  
  // Compute rolling 1-hour velocity per amount on the fly
  const hourMs = 60 * 60 * 1000;
  for (const p of payments) {
    const sameAmountInWindow = payments.filter(
      (other) =>
        other.amount === p.amount &&
        Math.abs(other.received_at - p.received_at) <= hourMs
    );
    if (sameAmountInWindow.length >= 3) {
      p.is_velocity_spike = true;
      p.velocity_count = sameAmountInWindow.length;
    }
  }
  
  return payments;
}

export async function updatePaymentConfidence(
  id: string,
  confidence: number,
  status: PaymentStatus
): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("payments").update({ confidence, status }).eq("id", id);
  if (error) throw new Error(`Failed to update payment confidence: ${error.message}`);
}

export async function resolvePayment(
  paymentId: string,
  orderId: string,
  confidence: number
): Promise<void> {
  const supabase = getSupabaseServer();
  const resolved_at = new Date().toISOString();
  const { error } = await supabase
    .from("payments")
    .update({
      status: "resolved",
      resolved_order_id: orderId,
      confidence,
      resolved_at,
    })
    .eq("id", paymentId);
  if (error) throw new Error(`Failed to resolve payment: ${error.message}`);
  await markOrderResolved(orderId);

  // Auto-fulfillment trigger: dispatch deterministic confirmation message to customer chat
  try {
    const order = await getOrderById(orderId);
    const productName = order?.product_name ?? "order";
    const firstName = order?.customer_name ? ` ${order.customer_name.split(" ")[0]}` : "";

    // Check if chat already has a final confirmation to avoid duplicates
    const existingChat = await getChatForPayment(paymentId);
    const alreadyConfirmed = existingChat.some(
      (c) => c.sender === "merchant_system" && c.message.includes("Confirmed — your")
    );

    if (!alreadyConfirmed) {
      await addChatMessage(
        paymentId,
        "merchant_system",
        `Confirmed — your ${productName} is on its way, thanks${firstName}!`
      );
      await addAudit({
        payment_id: paymentId,
        action: "auto_resolved",
        actor: "system",
        detail: `Auto-fulfillment: Order confirmation message dispatched to customer for "${productName}"`,
      });
    }
  } catch (chatErr) {
    console.error("Error dispatching auto-fulfillment chat confirmation:", chatErr);
  }
}

export async function unlinkPayment(paymentId: string): Promise<void> {
  const payment = await getPaymentById(paymentId);
  if (payment?.resolved_order_id) {
    await markOrderPending(payment.resolved_order_id);
  }
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("payments")
    .update({
      status: "unresolved",
      resolved_order_id: null,
      confidence: 0,
      resolved_at: null,
    })
    .eq("id", paymentId);
  if (error) throw new Error(`Failed to unlink payment: ${error.message}`);
}

// ---------- EVIDENCE LOG (Confidence Ledger) ----------

export async function appendEvidence(entry: {
  payment_id: string;
  candidate_order_id: string;
  signal_type: SignalType;
  signal_weight: number;
  detail?: string;
  confidence_after: number;
}): Promise<EvidenceEntry> {
  const supabase = getSupabaseServer();
  const dbSignalType = entry.signal_type === "merchant_rule" ? "payer_history" : entry.signal_type;

  const { data, error } = await supabase
    .from("evidence_log")
    .insert({
      payment_id: entry.payment_id,
      candidate_order_id: entry.candidate_order_id,
      signal_type: dbSignalType,
      signal_weight: entry.signal_weight,
      detail: entry.detail ?? null,
      confidence_after: entry.confidence_after,
    })
    .select()
    .single();
  if (error || !data) {
    throw new Error(`Failed to append evidence: ${error?.message}`);
  }
  const mapped = mapEvidence(data);
  if (entry.signal_type === "merchant_rule") {
    mapped.signal_type = "merchant_rule";
  }
  return mapped;
}

export async function getEvidenceForPayment(paymentId: string): Promise<EvidenceEntry[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("evidence_log")
    .select("*")
    .eq("payment_id", paymentId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to get evidence for payment: ${error.message}`);
  return (data || []).map(mapEvidence);
}

// ---------- AUDIT LOG ----------

const ALLOWED_DB_ACTIONS = new Set([
  "webhook_received",
  "evidence_added",
  "auto_resolved",
  "clarification_sent",
  "manual_review",
  "batch_resolved",
]);

const ALLOWED_DB_ACTORS = new Set([
  "system",
  "gemini",
  "merchant",
]);

export async function addAudit(entry: {
  payment_id?: string | null;
  action: AuditAction;
  actor: AuditActor;
  detail?: string;
}): Promise<AuditEntry> {
  const supabase = getSupabaseServer();

  // Safe mapping for Postgres enum constraints
  let dbAction = entry.action as string;
  if (!ALLOWED_DB_ACTIONS.has(dbAction)) {
    if (dbAction === "approved") dbAction = "auto_resolved";
    else if (dbAction === "reply_interpreted") dbAction = "clarification_sent";
    else if (dbAction === "batch_assignment") dbAction = "batch_resolved";
    else dbAction = "manual_review";
  }

  let dbActor = entry.actor as string;
  if (!ALLOWED_DB_ACTORS.has(dbActor)) {
    dbActor = "merchant";
  }

  const { data, error } = await supabase
    .from("audit_log")
    .insert({
      payment_id: entry.payment_id ?? null,
      action: dbAction,
      actor: dbActor,
      detail: entry.detail ?? null,
    })
    .select()
    .single();
  if (error || !data) {
    throw new Error(`Failed to add audit log: ${error?.message}`);
  }
  const mapped = mapAudit(data);
  mapped.action = entry.action;
  mapped.actor = entry.actor;
  return mapped;
}

export async function getAuditForPayment(paymentId: string): Promise<AuditEntry[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("payment_id", paymentId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to get audit for payment: ${error.message}`);
  return (data || []).map(mapAudit);
}

export async function getAllAudit(limit = 50): Promise<AuditEntry[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to get all audit logs: ${error.message}`);
  return (data || []).map(mapAudit);
}

// ---------- SIMULATED CHAT ----------

export async function addChatMessage(
  paymentId: string,
  sender: "merchant_system" | "customer",
  message: string
): Promise<ChatMessage> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("simulated_chat")
    .insert({
      payment_id: paymentId,
      sender,
      message,
    })
    .select()
    .single();
  if (error || !data) {
    throw new Error(`Failed to add chat message: ${error?.message}`);
  }
  return mapChat(data);
}

export async function getChatForPayment(paymentId: string): Promise<ChatMessage[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("simulated_chat")
    .select("*")
    .eq("payment_id", paymentId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to get chat for payment: ${error.message}`);
  return (data || []).map(mapChat);
}

// ---------- BATCH RESOLUTION HELPERS ----------

export async function getBatchResolvedPaymentIds(): Promise<Set<string>> {
  const supabase = getSupabaseServer();
  const set = new Set<string>();

  try {
    const { data: auditData } = await supabase
      .from("audit_log")
      .select("payment_id")
      .eq("action", "batch_resolved")
      .not("payment_id", "is", null);

    if (auditData) {
      for (const row of auditData) {
        if (row.payment_id) set.add(row.payment_id);
      }
    }

    const { data: evidenceData } = await supabase
      .from("evidence_log")
      .select("payment_id")
      .eq("signal_type", "batch_assignment");

    if (evidenceData) {
      for (const row of evidenceData) {
        if (row.payment_id) set.add(row.payment_id);
      }
    }
  } catch (err) {
    console.error("Error checking batch resolved payments:", err);
  }

  return set;
}

export async function getBatchResolutionInfoForPayment(paymentId: string): Promise<{
  isBatchResolved: boolean;
  siblingPayment: {
    id: string;
    amount: number;
    productName?: string;
    received_at: number;
  } | null;
}> {
  const supabase = getSupabaseServer();

  try {
    // Check if this payment is batch resolved
    const { data: auditData } = await supabase
      .from("audit_log")
      .select("id")
      .eq("payment_id", paymentId)
      .eq("action", "batch_resolved")
      .limit(1);

    const { data: evidenceData } = await supabase
      .from("evidence_log")
      .select("id")
      .eq("payment_id", paymentId)
      .eq("signal_type", "batch_assignment")
      .limit(1);

    const isBatchResolved = (auditData && auditData.length > 0) || (evidenceData && evidenceData.length > 0);

    if (!isBatchResolved) {
      return { isBatchResolved: false, siblingPayment: null };
    }

    // Payment is batch-resolved. Find sibling payment of same amount that was also batch resolved
    const thisPayment = await getPaymentById(paymentId);
    if (!thisPayment) {
      return { isBatchResolved: true, siblingPayment: null };
    }

    const allBatchIds = await getBatchResolvedPaymentIds();
    allBatchIds.delete(paymentId);

    if (allBatchIds.size === 0) {
      return { isBatchResolved: true, siblingPayment: null };
    }

    const { data: siblingPayments } = await supabase
      .from("payments")
      .select("*")
      .in("id", Array.from(allBatchIds))
      .eq("amount", thisPayment.amount)
      .limit(1);

    if (!siblingPayments || siblingPayments.length === 0) {
      return { isBatchResolved: true, siblingPayment: null };
    }

    const sibling = mapPayment(siblingPayments[0]);
    let siblingProductName: string | undefined;
    if (sibling.resolved_order_id) {
      const order = await getOrderById(sibling.resolved_order_id);
      siblingProductName = order?.product_name;
    }

    return {
      isBatchResolved: true,
      siblingPayment: {
        id: sibling.id,
        amount: sibling.amount,
        productName: siblingProductName,
        received_at: sibling.received_at,
      },
    };
  } catch (err) {
    console.error("Error getting batch resolution info:", err);
    return { isBatchResolved: false, siblingPayment: null };
  }
}

// ---------- DATA CLEANUP & SEEDING ----------

export async function clearAllData(benchmarkOnly = false): Promise<void> {
  const supabase = getSupabaseServer();
  if (benchmarkOnly) {
    await supabase.from("payments").delete().eq("is_benchmark", true);
    await supabase.from("orders").delete().eq("is_benchmark", true);
  } else {
    await supabase.from("simulated_chat").delete().gte("id", 0);
    await supabase.from("evidence_log").delete().gte("id", 0);
    await supabase.from("audit_log").delete().gte("id", 0);
    await supabase.from("payments").delete().not("id", "is", null);
    await supabase.from("orders").delete().not("id", "is", null);
  }
}

// ---------- MERCHANT CUSTOM RULES ----------

import { MerchantRule } from "./types";

let inMemoryMerchantRules: MerchantRule[] = [
  {
    id: "rule_vip_priya",
    rule_name: "VIP Repeat Customer (Priya Sharma)",
    condition_type: "customer_name",
    condition_value: "Priya Sharma",
    signal_weight: 0.20,
    detail: "Merchant Rule: Priority repeat customer loyalty bonus (+20%)",
    is_active: true,
    created_at: Date.now() - 86400000,
  },
];

export async function getMerchantRules(): Promise<MerchantRule[]> {
  const supabase = getSupabaseServer();
  try {
    const { data, error } = await supabase.from("merchant_rules").select("*").order("created_at", { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((r: any) => ({
        id: r.id,
        rule_name: r.rule_name,
        condition_type: r.condition_type,
        condition_value: r.condition_value,
        signal_weight: Number(r.signal_weight),
        detail: r.detail,
        is_active: Boolean(r.is_active),
        created_at: typeof r.created_at === "string" ? Date.parse(r.created_at) : (r.created_at || Date.now()),
      }));
    }
  } catch {}
  return [...inMemoryMerchantRules];
}

export async function createMerchantRule(input: {
  rule_name: string;
  condition_type: "customer_name" | "payer_identity_hash" | "payer_vpa_hash" | "product_name" | "min_amount";
  condition_value: string;
  signal_weight: number;
  detail?: string;
}): Promise<MerchantRule> {
  const rule: MerchantRule = {
    id: `rule_${Math.random().toString(36).substring(2, 10)}`,
    rule_name: input.rule_name,
    condition_type: input.condition_type,
    condition_value: input.condition_value,
    signal_weight: input.signal_weight,
    detail: input.detail || `Merchant custom rule: ${input.rule_name}`,
    is_active: true,
    created_at: Date.now(),
  };

  const supabase = getSupabaseServer();
  try {
    await supabase.from("merchant_rules").insert({
      id: rule.id,
      rule_name: rule.rule_name,
      condition_type: rule.condition_type,
      condition_value: rule.condition_value,
      signal_weight: rule.signal_weight,
      detail: rule.detail,
      is_active: rule.is_active,
    });
  } catch {}

  inMemoryMerchantRules.unshift(rule);
  return rule;
}

export async function deleteMerchantRule(id: string): Promise<void> {
  const supabase = getSupabaseServer();
  try {
    await supabase.from("merchant_rules").delete().eq("id", id);
  } catch {}
  inMemoryMerchantRules = inMemoryMerchantRules.filter((r) => r.id !== id);
}

export async function toggleMerchantRule(id: string, is_active: boolean): Promise<void> {
  const supabase = getSupabaseServer();
  try {
    await supabase.from("merchant_rules").update({ is_active }).eq("id", id);
  } catch {}
  const rule = inMemoryMerchantRules.find((r) => r.id === id);
  if (rule) rule.is_active = is_active;
}
