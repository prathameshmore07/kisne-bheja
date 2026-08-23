"use client";

import { useEffect, useState } from "react";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";

type Step = 0 | 1 | 2 | 3 | 4;

const TIMINGS: Record<Step, number> = {
  0: 2200, // Initial state: 45% unsure
  1: 1800, // AI question appears
  2: 1800, // Customer reply appears
  3: 2600, // Conf climbs to 98%, status flips
  4: 1000, // Loop transition
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
    <div className="w-full max-w-md mx-auto bg-white rounded-lg border border-line p-6 font-body">
      {/* Top: Incoming payment amount & status */}
      <div className="flex items-baseline justify-between pb-4 mb-4 border-b border-line">
        <div>
          <div className="font-display text-3xl font-bold tracking-tight text-ink">₹499.00</div>
          <div className="text-xs font-mono text-muted mt-0.5">UPI received · 2 orders with this price</div>
        </div>
        <div
          className="text-xs font-mono font-medium px-2.5 py-1 rounded"
          style={{
            color: isResolved ? "var(--green)" : "var(--amber)",
            backgroundColor: isResolved ? "rgba(34, 122, 86, 0.08)" : "rgba(220, 159, 61, 0.08)",
          }}
        >
          {isResolved ? "Payment matched" : "We're not sure yet"}
        </div>
      </div>

      {/* Center: Order candidate & animated confidence number */}
      <div className="py-2 mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="font-display font-bold text-base text-ink">
            Blue Kurta (Size M)
          </div>
          <div className="text-right">
            <span className="font-display text-2xl font-bold tabular-nums text-ink">{displayPct}%</span>
            <span className="text-[11px] font-mono text-muted ml-1.5">sure</span>
          </div>
        </div>

        {/* Thin precision bar */}
        <div className="h-1 rounded-full bg-line overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${displayPct}%`,
              backgroundColor: isResolved ? "var(--green)" : "var(--amber)",
            }}
          />
        </div>

        <div className="text-xs font-mono text-muted">
          {isResolved ? (
            <span className="text-green font-medium">✓ Customer confirmed in chat</span>
          ) : (
            <span>Same amount (+45%) · Timing match (+15%)</span>
          )}
        </div>
      </div>

      {/* Conversation: Plain, calm document style */}
      <div className="pt-4 border-t border-line space-y-2.5 min-h-[110px]">
        {showAIQuestion ? (
          <div className="text-xs text-ink animate-fadeIn">
            <div className="text-[10px] font-mono uppercase text-muted mb-0.5">Your store asked</div>
            <div className="p-2.5 rounded bg-paper text-ink leading-relaxed">
              Hi Priya! Just checking, was your ₹499 payment for the <strong>Blue Kurta</strong> or the <strong>Red Kurta</strong>?
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted font-mono italic py-4 text-center">
            {step === 0 ? "Asking customer one question..." : "Starting over..."}
          </div>
        )}

        {showCustomerReply && (
          <div className="text-xs text-ink animate-fadeIn">
            <div className="text-[10px] font-mono uppercase text-muted mb-0.5 text-right">Customer replied</div>
            <div className="p-2.5 rounded bg-paper text-ink ml-auto max-w-[85%] leading-relaxed font-mono">
              haan blue kurta wala
            </div>
          </div>
        )}
      </div>

      {/* Loop Progress Indicator */}
      <div className="flex items-center justify-center gap-1.5 mt-5 pt-3 border-t border-line/60">
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
