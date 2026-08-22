"use client";

import { useEffect, useState } from "react";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";

type Step = 0 | 1 | 2 | 3 | 4;

const TIMINGS: Record<Step, number> = {
  0: 2000, // Initial state: 45% ambiguous
  1: 1800, // Clarification question bubble appears
  2: 1800, // Customer reply bubble appears
  3: 2500, // Confidence animates to 98%, status flips to Resolved
  4: 1000, // Reset transition
};

export default function LandingConfidenceDemo() {
  const [step, setStep] = useState<Step>(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStep((prev) => ((prev + 1) % 5) as Step);
    }, TIMINGS[step]);

    return () => clearTimeout(timer);
  }, [step]);

  const targetConfidence = step >= 3 ? 98 : 45;
  const animatedConfidence = useAnimatedNumber(targetConfidence, step >= 3 ? 800 : 300);
  const displayPct = Math.round(animatedConfidence);

  const isResolved = step >= 3;
  const showAIQuestion = step >= 1 && step <= 3;
  const showCustomerReply = step >= 2 && step <= 3;

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl border border-line p-5 shadow-sm font-body">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-line">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
          <span className="text-xs font-mono font-medium text-ink">Live Reconciliation Demo</span>
        </div>
        <div
          className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded transition-colors duration-500"
          style={{
            color: isResolved ? "var(--green)" : "var(--amber)",
            backgroundColor: isResolved ? "rgba(34, 122, 86, 0.1)" : "rgba(220, 159, 61, 0.1)",
          }}
        >
          {isResolved ? "Auto-Resolved" : "Ambiguous (2 collisions)"} · {displayPct}%
        </div>
      </div>

      {/* Payment Meta */}
      <div className="bg-paper rounded-lg p-3 mb-4 border border-line/60">
        <div className="flex justify-between items-center text-xs font-mono text-muted mb-1">
          <span>PAYMENT RECEIVED</span>
          <span>pay_sim_90412</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="font-display text-2xl font-bold text-ink">₹499.00</span>
          <span className="text-xs font-mono text-muted">via UPI (Payer: Priya S.)</span>
        </div>
      </div>

      {/* Top Candidate Card */}
      <div
        className="rounded-lg p-4 border transition-all duration-500 mb-4 bg-white"
        style={{
          borderColor: isResolved ? "var(--green)" : "var(--amber)",
          boxShadow: isResolved ? "0 2px 8px rgba(34, 122, 86, 0.08)" : "none",
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-display font-bold text-sm text-ink">Blue Kurta (Size M)</h4>
              {isResolved && (
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-green/10 text-green font-bold">
                  Matched
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-muted">Order #902 · Priya Sharma · 4m ago</div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl font-bold tabular-nums text-ink">{displayPct}%</div>
            <div className="text-[9px] font-mono uppercase text-muted">Confidence</div>
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="h-1.5 rounded-full bg-line overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${displayPct}%`,
              backgroundColor: isResolved ? "var(--green)" : "var(--amber)",
            }}
          />
        </div>

        {/* Evidence items */}
        <div className="space-y-1 font-mono text-[11px]">
          <div className="flex items-center justify-between text-muted">
            <span className="text-ink">✓ Amount match (+45%)</span>
            <span>2 colliding orders</span>
          </div>
          <div className="flex items-center justify-between text-muted">
            <span className="text-ink">✓ Timing fresh (+15%)</span>
            <span>Received within 4m</span>
          </div>
          {isResolved && (
            <div className="flex items-center justify-between text-green font-semibold animate-fadeIn">
              <span>✓ Customer confirmation (+38%)</span>
              <span>WhatsApp reply verified</span>
            </div>
          )}
        </div>
      </div>

      {/* Simulated Conversational WhatsApp Clarification */}
      <div className="bg-paper rounded-lg p-3 border border-line/60 space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted font-semibold mb-1">
          Automated WhatsApp Clarification (Max 1 Ask)
        </div>

        {showAIQuestion ? (
          <div className="bg-white border border-line rounded-lg rounded-tl-none p-2.5 text-xs text-ink animate-fadeIn shadow-2xs max-w-[90%]">
            <div className="text-[10px] font-mono text-muted mb-0.5">Merchant System (AI drafted)</div>
            Hi Priya! Just confirming — is your ₹499 payment for the <strong>Blue Kurta</strong> or the <strong>Red Kurta</strong>?
          </div>
        ) : (
          <div className="text-xs text-muted italic font-mono py-1">
            {step === 0 ? "Awaiting automated clarification trigger..." : "State resetting..."}
          </div>
        )}

        {showCustomerReply && (
          <div className="bg-[#227A56]/10 border border-[#227A56]/20 rounded-lg rounded-tr-none p-2.5 text-xs text-ink ml-auto max-w-[85%] animate-fadeIn">
            <div className="text-[10px] font-mono text-green font-bold mb-0.5">Customer (WhatsApp)</div>
            haan blue kurta wala
          </div>
        )}
      </div>

      {/* Loop Progress Indicator */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              (step === i || (step === 4 && i === 3)) ? "w-6 bg-ink" : "w-1.5 bg-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
