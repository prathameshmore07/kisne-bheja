"use client";

import { useEffect, useRef, useState } from "react";
import { formatRupees, statusColor, statusLabel } from "@/lib/format";
import { EvidenceEntry, PaymentStatus, SignalType } from "@/lib/types";

export interface CandidateData {
  order_id: string;
  product_name: string;
  amount?: number;
  customer_name?: string | null;
  customer_vpa_hash?: string | null;
  confidence: number;
  evidence: EvidenceEntry[];
}

export interface PaymentData {
  id: string;
  status: PaymentStatus;
  confidence: number;
  amount: number;
  resolved_order_id?: string | null;
}

export interface LiveConfidenceProps {
  paymentId: string;
  initialPayment: PaymentData;
  initialCandidates: CandidateData[];
}

const SETTLED_STATUSES: PaymentStatus[] = ["resolved", "manual_review"];
const POLL_MS = 1000;

const SIGNAL_LABELS: Record<string, string> = {
  amount_match: "Amount match",
  timing: "Timing",
  payer_history: "Payer history",
  order_age: "Order age",
  link_metadata: "Link metadata",
  conversation: "Conversation",
  negative: "Negative / Ruled out",
  partial: "Partial payment",
};

export default function LiveConfidence({
  paymentId,
  initialPayment,
  initialCandidates,
}: LiveConfidenceProps) {
  const [payment, setPayment] = useState<PaymentData>(initialPayment);
  const [candidates, setCandidates] = useState<CandidateData[]>(initialCandidates);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refetch() {
    try {
      const res = await fetch(`/api/payments/${paymentId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.payment) setPayment(data.payment);
      if (data.candidates) setCandidates(data.candidates);
      if (SETTLED_STATUSES.includes(data.payment?.status) && intervalRef.current) {
        // keep polling active so manual unlinks/rejections still update smoothly
      }
    } catch {
      // silent — next poll retries
    }
  }

  useEffect(() => {
    intervalRef.current = setInterval(refetch, POLL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paymentId]);

  async function handleApprove(orderId: string) {
    setBusyOrderId(orderId);
    try {
      await fetch(`/api/payments/${paymentId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      await refetch();
    } finally {
      setBusyOrderId(null);
    }
  }

  async function handleReject(orderId: string) {
    setBusyOrderId(orderId);
    try {
      await fetch(`/api/payments/${paymentId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      await refetch();
    } finally {
      setBusyOrderId(null);
    }
  }

  async function handleUnlink() {
    setBusyOrderId("unlink");
    try {
      await fetch(`/api/payments/${paymentId}/unlink`, { method: "POST" });
      await refetch();
    } finally {
      setBusyOrderId(null);
    }
  }

  const isSettled = payment.status === "resolved";
  const showActions = payment.status === "ambiguous" || payment.status === "manual_review";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display text-lg font-bold">Evidence Graph</h2>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-paper border border-line text-[11px] font-mono text-muted">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSettled ? "bg-muted" : "bg-green animate-pulse"
              }`}
            />
            <span>{isSettled ? "Settled" : "Live"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="text-xs font-body font-medium px-3 py-1 rounded transition-colors"
            style={{
              color: statusColor(payment.status),
              backgroundColor: `${statusColor(payment.status)}1A`,
            }}
          >
            {statusLabel(payment.status)} · {Math.round(payment.confidence * 100)}%
          </div>

          {payment.status === "resolved" && (
            <button
              onClick={handleUnlink}
              disabled={busyOrderId === "unlink"}
              className="text-xs font-mono underline text-red hover:opacity-80 disabled:opacity-50 cursor-pointer"
            >
              {busyOrderId === "unlink" ? "Unlinking..." : "Wrong match? Unlink"}
            </button>
          )}
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="bg-white border border-line rounded-lg p-6 text-sm text-muted font-body">
          No candidate orders evaluated yet.
        </div>
      ) : (
        <div className="space-y-4">
          {candidates.map((cand, idx) => {
            const isTopCandidate = idx === 0;
            const isResolved = payment.resolved_order_id === cand.order_id;
            const pct = Math.round(cand.confidence * 100);

            const borderColor = isResolved
              ? "var(--green)"
              : isTopCandidate && cand.confidence >= 0.6
              ? statusColor(payment.status)
              : "var(--line)";

            return (
              <div
                key={cand.order_id}
                className="bg-white rounded-lg p-5 transition-all duration-300 shadow-xs border"
                style={{
                  borderWidth: isResolved || (isTopCandidate && cand.confidence >= 0.6) ? "2px" : "1px",
                  borderColor: borderColor,
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-base">
                        {cand.product_name}
                      </h3>
                      {isResolved && (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-green/10 text-green font-bold">
                          Linked
                        </span>
                      )}
                      {isTopCandidate && !isResolved && (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber/10 text-amber font-bold">
                          Top Match
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted font-mono mt-0.5">
                      {cand.amount ? formatRupees(cand.amount) : ""}
                      {cand.customer_name ? ` · ${cand.customer_name}` : ""}
                      {cand.customer_vpa_hash ? ` (${cand.customer_vpa_hash})` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-display font-bold text-xl tabular-nums transition-all duration-500">
                        {pct}%
                      </div>
                      <div className="text-[10px] text-muted font-mono uppercase tracking-wider">
                        Confidence
                      </div>
                    </div>

                    {showActions && (
                      <div className="flex items-center gap-1.5 ml-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(cand.order_id)}
                          disabled={busyOrderId === cand.order_id}
                          className="text-xs font-mono font-medium px-2.5 py-1 rounded bg-[#227A56] text-white hover:bg-[#227A56]/90 disabled:opacity-50 cursor-pointer shadow-2xs transition-colors"
                        >
                          {busyOrderId === cand.order_id ? "..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(cand.order_id)}
                          disabled={busyOrderId === cand.order_id}
                          className="text-xs font-mono font-medium px-2.5 py-1 rounded border border-red text-red hover:bg-red/5 disabled:opacity-50 cursor-pointer transition-colors"
                        >
                          {busyOrderId === cand.order_id ? "..." : "Not this"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Animated Confidence Bar */}
                <div className="h-2 rounded-full bg-line overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(0, Math.min(100, pct))}%`,
                      backgroundColor:
                        pct >= 85
                          ? "var(--green)"
                          : pct >= 60
                          ? "var(--amber)"
                          : "var(--muted)",
                    }}
                  />
                </div>

                {/* Evidence Items */}
                <div className="bg-paper rounded-md p-3">
                  <div className="text-[11px] uppercase tracking-wider font-mono text-muted mb-2 font-semibold">
                    Evidence Trail ({cand.evidence.length})
                  </div>
                  {cand.evidence.length === 0 ? (
                    <div className="text-xs text-muted font-body">No signals recorded.</div>
                  ) : (
                    <div className="space-y-1.5 font-mono text-xs">
                      {cand.evidence.map((ev) => {
                        const isPositive = ev.signal_weight >= 0;
                        return (
                          <div
                            key={ev.id}
                            className="flex items-start justify-between gap-2 animate-fadeIn"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] shrink-0 font-bold ${
                                  isPositive
                                    ? "bg-green/10 text-green"
                                    : "bg-red/10 text-red"
                                }`}
                              >
                                {isPositive ? "+" : ""}{Math.round(ev.signal_weight * 100)}%
                              </span>
                              <span className="font-medium text-ink uppercase text-[11px] shrink-0">
                                {SIGNAL_LABELS[ev.signal_type] ?? ev.signal_type.replace(/_/g, " ")}
                              </span>
                              <span className="text-muted truncate text-[11px]">
                                — {ev.detail}
                              </span>
                            </div>
                            <span className="text-muted shrink-0 text-[11px]">
                              → {Math.round(ev.confidence_after * 100)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
