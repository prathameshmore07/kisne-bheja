"use client";

import { useEffect, useState } from "react";
import { formatRupees, statusColor, statusLabel } from "@/lib/format";
import { EvidenceEntry, PaymentStatus } from "@/lib/types";

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

export default function LiveConfidence({
  paymentId,
  initialPayment,
  initialCandidates,
}: LiveConfidenceProps) {
  const [payment, setPayment] = useState<PaymentData>(initialPayment);
  const [candidates, setCandidates] = useState<CandidateData[]>(initialCandidates);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchLatest() {
      try {
        const res = await fetch(`/api/payments/${paymentId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.payment) {
          setPayment(data.payment);
          if (data.candidates) {
            setCandidates(data.candidates);
          }
          if (SETTLED_STATUSES.includes(data.payment.status)) {
            // Can slow down polling once settled
          }
        }
      } catch (err) {
        console.error("Live confidence poll error:", err);
      }
    }

    const interval = setInterval(fetchLatest, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [paymentId]);

  const isSettled = SETTLED_STATUSES.includes(payment.status);

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

        <div
          className="text-xs font-body font-medium px-3 py-1 rounded transition-colors"
          style={{
            color: statusColor(payment.status),
            backgroundColor: `${statusColor(payment.status)}1A`,
          }}
        >
          {statusLabel(payment.status)}
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
                className="bg-white rounded-lg p-5 transition-all duration-300 shadow-xs"
                style={{
                  borderWidth: isResolved || (isTopCandidate && cand.confidence >= 0.6) ? "2px" : "1px",
                  borderColor: borderColor,
                }}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
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

                  <div className="text-right shrink-0">
                    <div className="font-display font-bold text-xl transition-all duration-500">{pct}%</div>
                    <div className="text-[10px] text-muted font-mono uppercase tracking-wider">Confidence</div>
                  </div>
                </div>

                {/* Live Animated Confidence Bar */}
                <div className="h-2 rounded-full bg-line overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${pct}%`,
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
                        const isPositive = ev.signal_weight > 0;
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
                                {ev.signal_type.replace(/_/g, " ")}
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
