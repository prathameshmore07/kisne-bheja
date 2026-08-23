"use client";

import { useMemo } from "react";
import { CandidateItem } from "./CandidateEvidenceCard";

interface TopTwoComparisonCardProps {
  candidateA: CandidateItem;
  candidateB: CandidateItem;
}

const SIGNAL_LABELS: Record<string, string> = {
  amount_match: "Amount Match",
  timing: "Timing Proximity",
  payer_history: "Payer Identity",
  conversation: "Customer Confirmation",
  batch_assignment: "Joint Assignment",
  merchant_rule: "Merchant Rule",
  link_metadata: "Payment Link",
  order_age: "Order Freshness",
  negative: "Negative / Excluded",
};

export default function TopTwoComparisonCard({
  candidateA,
  candidateB,
}: TopTwoComparisonCardProps) {
  // Collect all unique signal types present across both candidates
  const comparisonRows = useMemo(() => {
    const signalsA = candidateA.evidence || [];
    const signalsB = candidateB.evidence || [];

    const allSignalTypes = Array.from(
      new Set([...signalsA.map((s) => s.signal_type), ...signalsB.map((s) => s.signal_type)])
    );

    return allSignalTypes.map((type) => {
      const evA = signalsA.find((s) => s.signal_type === type);
      const evB = signalsB.find((s) => s.signal_type === type);

      const weightA = evA ? evA.signal_weight : 0;
      const weightB = evB ? evB.signal_weight : 0;
      const diff = weightA - weightB;

      let keyTakeaway = "Equal signal weight";
      if (diff > 0) {
        keyTakeaway = `Favors ${candidateA.product_name} (+${Math.round(diff * 100)}%)`;
      } else if (diff < 0) {
        keyTakeaway = `Favors ${candidateB.product_name} (+${Math.round(Math.abs(diff) * 100)}%)`;
      }

      return {
        signalType: type,
        label: SIGNAL_LABELS[type] || type,
        evA,
        evB,
        weightA,
        weightB,
        keyTakeaway,
        diff,
      };
    });
  }, [candidateA, candidateB]);

  const scoreA = Math.round(candidateA.confidence * 100);
  const scoreB = Math.round(candidateB.confidence * 100);

  return (
    <div className="mb-8 border border-line rounded-lg bg-white overflow-hidden shadow-xs font-body animate-fadeIn">
      {/* Header */}
      <div className="px-5 py-3.5 bg-paper border-b border-line flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v18M3 9l9-6 9 6M3 9l4 7a4 4 0 0 0 6-3.5L9 9M21 9l-4 7a4 4 0 0 1-6-3.5L15 9" />
          </svg>
          <span className="font-display font-bold text-sm text-ink">
            Top-Two Candidate Comparison
          </span>
        </div>
        <span className="text-xs text-muted font-mono">
          Side-by-side evidence analysis
        </span>
      </div>

      {/* Comparison Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-line bg-paper/50 font-mono text-muted uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-4 font-medium w-1/4">Signal Type</th>
              <th className="py-2.5 px-4 font-medium w-1/3">
                <span className="text-ink font-bold">{candidateA.product_name}</span>
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-ink/10 text-ink text-[10px]">
                  {scoreA}%
                </span>
              </th>
              <th className="py-2.5 px-4 font-medium w-1/3">
                <span className="text-ink font-bold">{candidateB.product_name}</span>
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-muted/15 text-muted text-[10px]">
                  {scoreB}%
                </span>
              </th>
              <th className="py-2.5 px-4 font-medium text-right">Differentiating Factor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {comparisonRows.map((row) => {
              const isSignificant = Math.abs(row.diff) > 0.05;
              return (
                <tr
                  key={row.signalType}
                  className={`transition-colors ${
                    isSignificant ? "bg-amber/5" : "hover:bg-paper/40"
                  }`}
                >
                  {/* Signal Name */}
                  <td className="py-3 px-4 font-medium font-mono text-ink">
                    {row.label}
                  </td>

                  {/* Candidate A Evidence */}
                  <td className="py-3 px-4">
                    {row.evA ? (
                      <div>
                        <div className="font-mono font-medium text-ink flex items-center gap-1">
                          <span>
                            {row.weightA >= 0 ? `+${Math.round(row.weightA * 100)}%` : `${Math.round(row.weightA * 100)}%`}
                          </span>
                        </div>
                        <div className="text-muted text-[11px] mt-0.5 leading-snug">
                          {row.evA.detail || "Applied"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted/60 font-mono">—</span>
                    )}
                  </td>

                  {/* Candidate B Evidence */}
                  <td className="py-3 px-4">
                    {row.evB ? (
                      <div>
                        <div className="font-mono font-medium text-ink flex items-center gap-1">
                          <span>
                            {row.weightB >= 0 ? `+${Math.round(row.weightB * 100)}%` : `${Math.round(row.weightB * 100)}%`}
                          </span>
                        </div>
                        <div className="text-muted text-[11px] mt-0.5 leading-snug">
                          {row.evB.detail || "Applied"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted/60 font-mono">—</span>
                    )}
                  </td>

                  {/* Differentiating Factor */}
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-block font-mono text-[11px] px-2 py-0.5 rounded border ${
                        row.diff > 0
                          ? "bg-green/10 text-green border-green/20 font-medium"
                          : row.diff < 0
                          ? "bg-amber/10 text-amber border-amber/20 font-medium"
                          : "bg-paper text-muted border-line"
                      }`}
                    >
                      {row.keyTakeaway}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="px-5 py-3 bg-paper/60 border-t border-line text-xs text-muted flex flex-wrap items-center justify-between gap-2">
        <span>
          Why <strong className="text-ink">{candidateA.product_name}</strong> leads: higher cumulative signal weight (+{scoreA - scoreB}% spread)
        </span>
        <span className="font-mono text-[11px]">
          Threshold policy enforced: &ge;85% for auto-resolution
        </span>
      </div>
    </div>
  );
}
