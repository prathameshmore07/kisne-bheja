"use client";

import React, { useState } from "react";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";

interface EvidenceItem {
  id: number;
  signal_type: string;
  signal_weight: number;
  detail: string | null;
  confidence_after: number;
}

export interface CandidateItem {
  order_id: string;
  product_name: string;
  amount?: number;
  customer_name?: string | null;
  customer_identity_hash?: string | null;
  customer_vpa_hash?: string | null;
  confidence: number;
  evidence: EvidenceItem[];
}

const SIGNAL_LABELS: Record<string, string> = {
  amount_match: "Same amount",
  timing: "Arrived around the same time",
  payer_history: "You've paid before",
  order_age: "Order is getting old",
  link_metadata: "This link was made for this order",
  conversation: "Customer confirmed it",
  negative: "Not this one",
  partial: "Paid less than the order",
  batch_assignment: "Resolved together with another payment",
};

interface CandidateEvidenceCardProps {
  paymentId: string;
  candidate: CandidateItem;
  isBest: boolean;
  color: string;
  showActions: boolean;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export default function CandidateEvidenceCard({
  paymentId,
  candidate,
  isBest,
  color,
  showActions,
  busy,
  onApprove,
  onReject,
}: CandidateEvidenceCardProps) {
  const animatedPct = useAnimatedNumber(Math.round(candidate.confidence * 100));
  const displayPct = Math.round(animatedPct);

  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  async function handleExplain() {
    setExplaining(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: candidate.order_id }),
      });
      const data = await res.json();
      if (data.explanation) {
        setExplanation(data.explanation);
      }
    } catch {
      setExplanation("Could not load explanation right now.");
    } finally {
      setExplaining(false);
    }
  }

  return (
    <div
      className="border rounded-lg p-5 bg-white transition-all duration-300"
      style={{ borderColor: isBest ? color : "var(--line)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-medium text-base text-ink">
              {candidate.product_name}
            </h3>
            {isBest && candidate.confidence >= 0.6 && (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber/10 text-amber border border-amber/20 font-bold">
                Best match
              </span>
            )}
          </div>
          <div className="text-xs text-muted font-mono mt-0.5">
            {candidate.amount ? `₹${(candidate.amount / 100).toFixed(2)}` : ""}
            {candidate.customer_name ? ` · ${candidate.customer_name}` : ""}
            {candidate.customer_vpa_hash ? ` (${candidate.customer_vpa_hash})` : ""}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-display text-2xl font-bold tabular-nums text-ink">
              {displayPct}%
            </div>
            <div className="text-[9px] font-mono uppercase text-muted">
              How sure we are
            </div>
          </div>

          {showActions && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onApprove}
                disabled={busy}
                className="text-xs font-mono px-2.5 py-1 rounded bg-[#227A56] dark:bg-[#10B981] dark:text-gray-950 dark:font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer transition-colors shadow-xs"
              >
                {busy ? "..." : "Confirm"}
              </button>
              <button
                type="button"
                onClick={onReject}
                disabled={busy}
                className="text-xs font-mono px-2.5 py-1 rounded border border-red text-red hover:bg-red/10 disabled:opacity-50 cursor-pointer transition-colors"
              >
                {busy ? "..." : "Not this one"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Frame-by-frame JS Animated Confidence Bar */}
      <div className="h-1.5 rounded-full bg-line overflow-hidden mb-4">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, animatedPct))}%`,
            backgroundColor: isBest ? color : "var(--muted)",
          }}
        />
      </div>

      {/* Evidence Trail */}
      <div className="space-y-2 mb-3">
        {candidate.evidence.map((e) => {
          const isPositive = e.signal_weight >= 0;
          return (
            <div
              key={e.id}
              className="flex items-center gap-3 text-xs font-body animate-[fadeIn_0.5s_ease-out]"
            >
              <div
                className="w-16 shrink-0 font-mono text-xs font-semibold"
                style={{ color: isPositive ? "var(--green)" : "var(--red)" }}
              >
                {isPositive ? "+" : ""}
                {Math.round(e.signal_weight * 100)}%
              </div>
              <div className="w-36 shrink-0 text-[11px] text-muted font-mono uppercase tracking-wide">
                {SIGNAL_LABELS[e.signal_type] ?? e.signal_type}
              </div>
              <div className="flex-1 text-ink text-xs">{e.detail}</div>
            </div>
          );
        })}
        {candidate.evidence.length === 0 && (
          <div className="text-xs text-muted font-body">No checks recorded for this order yet.</div>
        )}
      </div>

      {/* Plain Language Explanation */}
      <div className="pt-3 border-t border-line/60">
        {!explanation && (
          <button
            type="button"
            onClick={handleExplain}
            disabled={explaining}
            className="text-xs font-mono text-muted hover:text-ink underline disabled:opacity-50 cursor-pointer transition-colors"
          >
            {explaining ? "Checking reasons..." : "Why this order?"}
          </button>
        )}
        {explanation && (
          <div className="bg-paper border border-line rounded p-2.5 text-xs font-body text-ink italic animate-[fadeIn_0.4s_ease-out]">
            <span className="font-mono not-italic font-semibold text-[11px] uppercase text-muted block mb-0.5">
              Why we think this
            </span>
            &ldquo;{explanation}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
