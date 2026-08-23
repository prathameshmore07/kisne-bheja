"use client";

import { useEffect, useState } from "react";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const TIMINGS: Record<Step, number> = {
  0: 2200, // Scenario 1: Initial state (45% unsure)
  1: 1800, // Scenario 1: AI question appears
  2: 1800, // Scenario 1: Customer reply appears
  3: 2800, // Scenario 1: Resolved to 98%
  4: 2400, // Scenario 2: Two payments of ₹499 arrive at once
  5: 3400, // Scenario 2: Both resolved together in one step
  6: 1200, // Transition pause before loop reset
};

export default function LandingConfidenceDemo() {
  const [step, setStep] = useState<Step>(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      setStep((prev) => ((prev + 1) % 7) as Step);
    }, TIMINGS[step]);

    return () => clearTimeout(timer);
  }, [step, isPaused]);

  // Scenario 1 animation
  const isScenario1Resolved = step === 3;
  const targetConfidence1 = isScenario1Resolved ? 98 : 45;
  const animatedConfidence1 = useAnimatedNumber(targetConfidence1, isScenario1Resolved ? 700 : 300);
  const displayPct1 = Math.round(animatedConfidence1);

  // Scenario 2 animation
  const isScenario2Resolved = step >= 5;
  const targetConfidence2A = isScenario2Resolved ? 98 : 45;
  const targetConfidence2B = isScenario2Resolved ? 96 : 45;
  const animatedConfidence2A = useAnimatedNumber(targetConfidence2A, isScenario2Resolved ? 600 : 300);
  const animatedConfidence2B = useAnimatedNumber(targetConfidence2B, isScenario2Resolved ? 600 : 300);
  const displayPct2A = Math.round(animatedConfidence2A);
  const displayPct2B = Math.round(animatedConfidence2B);

  const isScenario2 = step >= 4 && step <= 6;

  return (
    <div
      className="w-full max-w-md mx-auto bg-white rounded-lg border border-line p-6 font-body shadow-xs transition-all"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Scenario Mode Switcher */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-line text-xs font-mono">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep(0)}
            className={`px-2.5 py-1 rounded transition-colors ${
              !isScenario2
                ? "bg-ink text-paper font-semibold"
                : "text-muted hover:text-ink bg-paper"
            }`}
          >
            1. One payment
          </button>
          <button
            type="button"
            onClick={() => setStep(4)}
            className={`px-2.5 py-1 rounded transition-colors ${
              isScenario2
                ? "bg-ink text-paper font-semibold"
                : "text-muted hover:text-ink bg-paper"
            }`}
          >
            2. Two at once
          </button>
        </div>
        <span className="text-[10px] text-muted uppercase tracking-wider">
          {isScenario2 ? "Harder case" : "Live story"}
        </span>
      </div>

      {!isScenario2 ? (
        /* SCENARIO 1: Single ambiguous payment with WhatsApp clarification */
        <div className="animate-fadeIn">
          {/* Top: Incoming payment amount & status */}
          <div className="flex items-baseline justify-between pb-4 mb-4 border-b border-line">
            <div>
              <div className="font-display text-3xl font-bold tracking-tight text-ink">₹499.00</div>
              <div className="text-xs font-mono text-muted mt-0.5">UPI received · 2 orders with this price</div>
            </div>
            <div
              className={`text-xs font-mono font-medium px-2.5 py-1 rounded transition-colors border ${
                isScenario1Resolved
                  ? "bg-green/10 text-green border-green/20"
                  : "bg-amber/10 text-amber border-amber/20"
              }`}
            >
              {isScenario1Resolved ? "Payment matched" : "We're not sure yet"}
            </div>
          </div>

          {/* Center: Order candidate & animated confidence number */}
          <div className="py-1 mb-4">
            <div className="flex items-baseline justify-between mb-2">
              <div className="font-display font-bold text-base text-ink">
                Blue Kurta (Size M)
              </div>
              <div className="text-right">
                <span className="font-display text-2xl font-bold tabular-nums text-ink">{displayPct1}%</span>
                <span className="text-[11px] font-mono text-muted ml-1.5">sure</span>
              </div>
            </div>

            {/* Precision bar */}
            <div className="h-1.5 rounded-full bg-line overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${displayPct1}%`,
                  backgroundColor: isScenario1Resolved ? "var(--green)" : "var(--amber)",
                }}
              />
            </div>

            <div className="text-xs font-mono text-muted">
              {isScenario1Resolved ? (
                <span className="text-green font-medium">✓ Customer confirmed in chat · Red Kurta ruled out</span>
              ) : (
                <span>Same amount (+45%) · Timing match (+15%)</span>
              )}
            </div>
          </div>

          {/* WhatsApp conversation thread */}
          <div className="pt-4 border-t border-line space-y-2 min-h-[140px]">
            {step >= 1 && step <= 3 ? (
              <div className="text-xs text-ink animate-fadeIn">
                <div className="text-[10px] font-mono uppercase text-muted mb-0.5">Your store asked</div>
                <div className="p-2 rounded bg-paper text-ink leading-relaxed">
                  Hi Priya! Just checking, was your ₹499 payment for the <strong>Blue Kurta</strong> or the <strong>Red Kurta</strong>?
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted font-mono italic py-4 text-center">
                Asking customer one question...
              </div>
            )}

            {step >= 2 && step <= 3 && (
              <div className="text-xs text-ink animate-fadeIn">
                <div className="text-[10px] font-mono uppercase text-muted mb-0.5 text-right">Customer replied</div>
                <div className="p-2 rounded bg-paper text-ink ml-auto max-w-[85%] leading-relaxed font-mono">
                  haan blue kurta wala
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-xs text-ink animate-fadeIn">
                <div className="text-[10px] font-mono uppercase text-green font-semibold mb-0.5 flex items-center justify-between">
                  <span>Your store (auto-confirmed)</span>
                  <span className="text-[9px] bg-green/10 text-green px-1.5 py-0.5 rounded font-mono">Auto-fulfillment</span>
                </div>
                <div className="p-2 rounded bg-green/10 text-green dark:text-emerald-300 leading-relaxed font-medium border border-green/20">
                  Confirmed — your Blue Kurta is on its way, thanks Priya! 📦
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SCENARIO 2: Two payments of the exact same amount landing together */
        <div className="animate-fadeIn">
          {/* Header Banner */}
          <div className="pb-3 mb-3 border-b border-line">
            <div className="flex items-center justify-between">
              <span className="font-display text-base font-bold text-ink">
                Two ₹499 payments arrive together
              </span>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded font-semibold border ${
                  isScenario2Resolved
                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50"
                    : "bg-amber/10 text-amber border-amber/20"
                }`}
              >
                {isScenario2Resolved ? "Resolved together" : "2 ambiguous payments"}
              </span>
            </div>
            <p className="text-xs text-muted font-body mt-1 leading-relaxed">
              {isScenario2Resolved
                ? "Worked out both assignments together so neither order was confused for the other."
                : "Both share the same price. A simple matcher risks double-assigning the same order."}
            </p>
          </div>

          {/* Sibling Payment Rows */}
          <div className="space-y-3 my-3">
            {/* Payment 1 */}
            <div className="p-3 rounded border border-line bg-paper/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-ink">Payment 1: ₹499.00</span>
                <span className="tabular-nums font-semibold" style={{ color: isScenario2Resolved ? "var(--green)" : "var(--amber)" }}>
                  {displayPct2A}% sure
                </span>
              </div>
              <div className="h-1 rounded-full bg-line overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${displayPct2A}%`,
                    backgroundColor: isScenario2Resolved ? "var(--green)" : "var(--amber)",
                  }}
                />
              </div>
              <div className="text-[11px] font-body flex items-center justify-between text-muted">
                <span>{isScenario2Resolved ? "✓ Confirmed to Priya (Blue Kurta)" : "Candidate: Blue or Red Kurta"}</span>
                {isScenario2Resolved && <span className="text-[10px] font-mono text-green font-medium">Auto-confirmed</span>}
              </div>
            </div>

            {/* Payment 2 */}
            <div className="p-3 rounded border border-line bg-paper/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-ink">Payment 2: ₹499.00</span>
                <span className="tabular-nums font-semibold" style={{ color: isScenario2Resolved ? "var(--green)" : "var(--amber)" }}>
                  {displayPct2B}% sure
                </span>
              </div>
              <div className="h-1 rounded-full bg-line overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${displayPct2B}%`,
                    backgroundColor: isScenario2Resolved ? "var(--green)" : "var(--amber)",
                  }}
                />
              </div>
              <div className="text-[11px] font-body flex items-center justify-between text-muted">
                <span>{isScenario2Resolved ? "✓ Confirmed to Aman (Red Kurta)" : "Candidate: Blue or Red Kurta"}</span>
                {isScenario2Resolved && <span className="text-[10px] font-mono text-green font-medium">Auto-confirmed</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Dots / Controls */}
      <div className="flex items-center justify-between mt-5 pt-3 border-t border-line/60">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i as Step)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                step === i || (step === 6 && i === 5)
                  ? "w-6 bg-ink"
                  : i < 4
                  ? "w-2 bg-line hover:bg-muted"
                  : "w-2 bg-indigo-200 hover:bg-indigo-400"
              }`}
              title={`Step ${i + 1}`}
            />
          ))}
        </div>
        <span className="text-[10px] font-mono text-muted">
          {isPaused ? "Paused on hover" : "Autoplaying"}
        </span>
      </div>
    </div>
  );
}
