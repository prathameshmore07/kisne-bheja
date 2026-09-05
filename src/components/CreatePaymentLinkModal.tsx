"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PresetScenario {
  id: string;
  title: string;
  amount: string;
  subtitle: string;
  tag: string;
  description: string;
  expectedOutcome: string;
}

const PRESETS: PresetScenario[] = [
  {
    id: "kurta_collision",
    title: "2-Way Collision",
    amount: "499.00",
    subtitle: "Blue Kurta vs Red Kurta",
    tag: "Collision Pool",
    description: "Two pending orders share the exact same ₹499 price.",
    expectedOutcome: "Tests tie-breaking logic and in-dashboard merchant clarification.",
  },
  {
    id: "yoga_unique",
    title: "Single Match",
    amount: "799.00",
    subtitle: "Yoga Mat - Black",
    tag: "Clean Match",
    description: "One single pending order exists in the catalog with this price.",
    expectedOutcome: "Exact price and timing match triggers swift auto-match or 1-tap confirmation.",
  },
  {
    id: "card_payment",
    title: "Card Payment",
    amount: "649.00",
    subtitle: "Green Kurta (₹649)",
    tag: "Card Proxy",
    description: "Card payment with no VPA, using Card Network + Last-4 as identity proxy.",
    expectedOutcome: "Card Last-4 + Network proxy matches customer record (+35% score boost).",
  },
  {
    id: "unmatched_review",
    title: "Unmatched Amount",
    amount: "1250.00",
    subtitle: "Unknown Amount",
    tag: "Zero-Guessing",
    description: "No pending orders in the catalog share this price.",
    expectedOutcome: "Zero matching candidates safely routed to Needs Review queue without guessing.",
  },
];

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CreatePaymentLinkModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("kurta_collision");
  const [rupees, setRupees] = useState("499");
  const [description, setDescription] = useState("Kisne Bheja Live Test Payment");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  function selectPreset(preset: PresetScenario) {
    if (loading) return;
    setSelectedPreset(preset.id);
    setRupees(preset.amount.replace(",", ""));
    setDescription(`Test Payment: ${preset.title} (₹${preset.amount})`);
  }

  async function handleDirectPay(e?: React.FormEvent, directPreset?: PresetScenario) {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    const targetPreset = directPreset || PRESETS.find((p) => p.id === selectedPreset);
    const targetRupees = directPreset ? directPreset.amount.replace(",", "") : rupees;
    const targetDesc = directPreset
      ? `Test Payment: ${directPreset.title} (₹${directPreset.amount})`
      : description;

    try {
      const parsedFloat = parseFloat(targetRupees.replace(/,/g, ""));
      const amountPaise = Math.round(parsedFloat * 100);
      if (isNaN(amountPaise) || amountPaise <= 0) {
        throw new Error("Please enter a valid rupee amount");
      }

      await loadRazorpayScript();

      const res = await fetch("/api/create-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          description: targetDesc.trim() || "Kisne Bheja Test Payment",
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to create payment link");
      }

      if (data.auth_warning) {
        setError(`Razorpay Authentication Notice: ${data.auth_warning}. Please verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local with active test keys from Razorpay Dashboard.`);
        setLoading(false);
        return;
      }

      const keyId = data?.key_id || "rzp_test_TSp280vD1KUNbi";

      if (typeof window !== "undefined" && (window as any).Razorpay) {
        const options = {
          key: keyId,
          amount: amountPaise,
          currency: "INR",
          name: "Kisne Bheja Store",
          description: targetDesc,
          prefill: {
            contact: "9876543210",
            email: "merchant.test@kisnebheja.in",
          },
          theme: {
            color: "#1B1D22",
          },
          modal: {
            ondismiss: function () {
              setIsOpen(false);
              setLoading(false);
              router.refresh();
            },
          },
          handler: async function (response: any) {
            console.log("Razorpay payment completed:", response);
            try {
              if (response.razorpay_payment_id) {
                await fetch("/api/payments/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    razorpay_payment_id: response.razorpay_payment_id,
                    amount: amountPaise,
                    description: targetDesc,
                  }),
                });
              }
            } catch (err) {
              console.error("Payment verification error:", err);
            } finally {
              setIsOpen(false);
              setLoading(false);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("payment-updated"));
              }
              router.refresh();
            }
          },
        };

        const rzp = new (window as any).Razorpay(options);
        setIsOpen(false);
        setLoading(false);
        rzp.open();
      } else if (data?.short_url) {
        window.open(data.short_url, "_blank");
        setIsOpen(false);
        setLoading(false);
      } else {
        throw new Error("Could not open Razorpay screen. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to open Razorpay screen");
      setLoading(false);
    }
  }

  const currentPreset = PRESETS.find((p) => p.id === selectedPreset);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        className="text-xs font-mono px-3.5 py-2 rounded-lg border border-line bg-paper text-ink hover:border-ink hover:text-ink transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] font-semibold tracking-tight flex items-center gap-1.5"
      >
        <span>Test Payment (Razorpay)</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111827] border border-line rounded-2xl w-full max-w-xl font-body shadow-2xl overflow-hidden animate-scaleIn transition-all">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-line bg-gradient-to-b from-paper/80 to-transparent flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-ink tracking-tight flex items-center gap-2">
                  <span>Open Razorpay Checkout</span>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-green/10 text-green border border-green/20">
                    Test Mode
                  </span>
                </h3>
                <p className="text-xs text-muted font-body mt-1">
                  Select a test scenario and open the official Razorpay checkout screen to complete payment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                aria-label="Close modal"
                className="text-muted hover:text-ink font-mono text-xs cursor-pointer w-8 h-8 rounded-lg hover:bg-paper flex items-center justify-center transition-colors disabled:opacity-30 shrink-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <form onSubmit={(e) => handleDirectPay(e)} className="space-y-5">
                {error && (
                  <div className="p-3.5 rounded-xl bg-red/10 border border-red/20 text-red text-xs font-mono flex items-center gap-2.5 animate-fadeIn">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Scenario Grid */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
                      Choose Scenario to Pay
                    </label>
                    <span className="text-[11px] text-muted font-mono">Click to select</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {PRESETS.map((preset) => {
                      const isSelected = selectedPreset === preset.id;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => selectPreset(preset)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between group ${
                            isSelected
                              ? "bg-paper border-ink shadow-xs ring-1 ring-ink"
                              : "bg-white dark:bg-[#0B0F17] border-line hover:border-ink/50 hover:bg-paper/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <div>
                              <span className="font-display font-bold text-sm text-ink block leading-none">
                                ₹{preset.amount}
                              </span>
                              <span className="font-mono text-[11px] text-muted block mt-1">
                                {preset.title}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-ink/5 border border-line text-muted font-semibold">
                              {preset.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted leading-snug line-clamp-2 mt-1">
                            {preset.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Expected Resolution Callout */}
                {currentPreset && (
                  <div className="p-3.5 rounded-xl bg-paper border border-line text-xs font-body flex items-start gap-3 transition-all">
                    <div className="w-2 h-2 rounded-full bg-ink/70 shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink text-xs mb-0.5">
                        Expected Result
                      </div>
                      <p className="text-muted text-xs leading-relaxed">
                        {currentPreset.expectedOutcome}
                      </p>
                    </div>
                  </div>
                )}

                {/* Custom Parameters */}
                <div className="pt-3 border-t border-line space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
                      Payment Parameters
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-muted mb-1 font-medium">
                        Amount (₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-mono text-muted font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          required
                          disabled={loading}
                          value={rupees}
                          onChange={(e) => {
                            setRupees(e.target.value);
                            setSelectedPreset("");
                          }}
                          placeholder="499.00"
                          className="w-full font-mono text-xs pl-7 pr-3 py-2.5 bg-paper border border-line rounded-lg text-ink focus:outline-none focus:border-ink font-bold transition-colors disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-muted mb-1 font-medium">
                        Description
                      </label>
                      <input
                        type="text"
                        disabled={loading}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Payment description"
                        className="w-full font-mono text-xs px-3 py-2.5 bg-paper border border-line rounded-lg text-ink focus:outline-none focus:border-ink transition-colors disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-4 flex items-center justify-between gap-2.5 border-t border-line">
                  <div className="text-[11px] font-mono text-muted">
                    Test Mode (Standard Razorpay Checkout)
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      disabled={loading}
                      className="px-4 py-2.5 rounded-lg border border-line text-muted hover:text-ink hover:border-ink font-mono text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2.5 rounded-lg bg-ink text-paper hover:opacity-90 active:scale-[0.98] transition-all font-mono text-xs font-bold cursor-pointer shadow-xs flex items-center gap-2 disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                          <span>Opening Razorpay...</span>
                        </>
                      ) : (
                        <span>Open Razorpay Screen →</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
