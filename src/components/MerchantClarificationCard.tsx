"use client";

import { useState, useEffect } from "react";
import { formatRupees } from "@/lib/format";
import { CandidateItem } from "./CandidateEvidenceCard";

interface MerchantFraming {
  distinguishing_question: string;
  recent_pattern_insight?: string | null;
  distinguishing_factors?: string[];
}

interface MerchantClarificationCardProps {
  paymentId: string;
  paymentAmount: number;
  paymentStatus: string;
  candidates: CandidateItem[];
  initialFraming?: MerchantFraming | null;
  onApproveOrder?: (orderId: string) => void;
  busyOrderId?: string | null;
}

export default function MerchantClarificationCard({
  paymentId,
  paymentAmount,
  paymentStatus,
  candidates,
  initialFraming,
  onApproveOrder,
  busyOrderId,
}: MerchantClarificationCardProps) {
  const [framing, setFraming] = useState<MerchantFraming | null>(initialFraming ?? null);
  const [loading, setLoading] = useState(false);

  // Fetch or generate framing if not provided
  useEffect(() => {
    if (initialFraming) {
      setFraming(initialFraming);
      return;
    }

    if (paymentStatus === "resolved") return;

    let isMounted = true;
    async function loadFraming() {
      setLoading(true);
      try {
        const res = await fetch(`/api/payments/${paymentId}/clarify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.framing) {
            setFraming(data.framing);
          }
        }
      } catch (err) {
        console.error("Failed to load clarification framing:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFraming();
    return () => {
      isMounted = false;
    };
  }, [paymentId, paymentStatus, initialFraming]);

  if (paymentStatus === "resolved" && !framing) {
    return null;
  }

  return (
    <div className="border border-line rounded-lg p-6 bg-white transition-all shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-line mb-5">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-amber inline-block shrink-0 animate-pulse" />
          <h2 className="font-display font-bold text-base text-ink tracking-tight">
            AI-Assisted Reconciliation Note
          </h2>
        </div>
        <span className="text-[11px] font-mono text-muted uppercase tracking-wider">
          In-Dashboard Decision Framing
        </span>
      </div>

      {loading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-xs font-mono text-muted">
          <span className="w-3.5 h-3.5 border-2 border-muted/30 border-t-ink rounded-full animate-spin" />
          <span>Analyzing candidate orders &amp; recent payment patterns...</span>
        </div>
      ) : framing ? (
        <div className="space-y-4">
          {/* Distinguishing Question */}
          <div className="p-4 rounded-md bg-paper border border-line">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-1 font-medium">
              Distinguishing Question
            </div>
            <p className="font-body text-sm text-ink leading-relaxed font-medium">
              {framing.distinguishing_question}
            </p>
          </div>

          {/* Live Recent Pattern Detection Callout */}
          {framing.recent_pattern_insight && (
            <div className="p-4 rounded-md border border-amber/30 bg-amber/5 text-xs text-ink leading-relaxed">
              <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider font-bold text-amber mb-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <span>Live Recent Pattern Detected</span>
              </div>
              <p className="font-body text-xs text-ink/90">
                {framing.recent_pattern_insight}
              </p>
            </div>
          )}

          {/* Leading Candidate Action Grid */}
          {paymentStatus !== "resolved" && candidates.length > 0 && onApproveOrder && (
            <div className="pt-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-2 font-medium">
                Confirm Correct Pending Order
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {candidates.slice(0, 2).map((c) => {
                  const isBusy = busyOrderId === c.order_id;
                  return (
                    <div
                      key={c.order_id}
                      className="border border-line rounded-lg p-4 bg-paper/60 hover:border-ink/40 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display font-semibold text-sm text-ink">
                            {c.product_name}
                          </h3>
                          <span className="font-mono text-xs font-bold text-ink tabular-nums">
                            {Math.round(c.confidence * 100)}%
                          </span>
                        </div>
                        <div className="text-xs text-muted font-mono mt-1">
                          {c.customer_name ? `Customer: ${c.customer_name}` : "Unknown customer"}
                        </div>
                        <div className="text-[11px] text-muted font-body mt-2">
                          {c.evidence?.[0]?.detail || "Candidate amount match"}
                        </div>
                      </div>

                      <button
                        onClick={() => onApproveOrder(c.order_id)}
                        disabled={!!busyOrderId}
                        className="mt-4 w-full py-2 px-3 rounded bg-ink text-paper text-xs font-mono font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {isBusy ? (
                          <span>Reconciling...</span>
                        ) : (
                          <>
                            <span>Confirm Match</span>
                            <span>→</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bounded AI Role Note */}
          <div className="pt-3 border-t border-line/60 flex items-center justify-between text-[11px] font-mono text-muted">
            <span>Role: Strictly bounded to framing &amp; pattern detection</span>
            <span>Threshold policy &amp; merchant tap execute resolution</span>
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted font-body">
          No conflicting ambiguity detected for this payment.
        </div>
      )}
    </div>
  );
}
