"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PresetScenario {
  id: string;
  title: string;
  amount: string;
  subtitle: string;
  method: "upi" | "card";
  vpa?: string;
  cardLast4?: string;
  cardNetwork?: string;
  tag: string;
  tagType: "green" | "amber" | "red";
  description: string;
  expectedOutcome: string;
  projectedConfidence: string;
}

const PRESETS: PresetScenario[] = [
  {
    id: "kurta_collision",
    title: "2-Way Collision",
    amount: "499.00",
    subtitle: "Blue Kurta vs Red Kurta",
    method: "upi",
    vpa: "priya@okhdfcbank",
    tag: "Collision Pool",
    tagType: "amber",
    description: "Two orders share exact same ₹499 price. Tests tie-break matching.",
    expectedOutcome: "Payer VPA hash matches Priya Sharma record to boost score past 85% for auto-match.",
    projectedConfidence: "95% Auto-Match",
  },
  {
    id: "yoga_unique",
    title: "Single Candidate",
    amount: "799.00",
    subtitle: "Yoga Mat - Black",
    method: "upi",
    vpa: "neha@okaxis",
    tag: "Clean Match",
    tagType: "green",
    description: "One single pending order exists with this exact amount.",
    expectedOutcome: "Exact price and timing match routes for swift 1-click confirmation.",
    projectedConfidence: "80% Review",
  },
  {
    id: "card_payment",
    title: "Card Identity Proxy",
    amount: "649.00",
    subtitle: "Visa ···· 4242",
    method: "card",
    cardLast4: "4242",
    cardNetwork: "Visa",
    tag: "Card Proxy",
    tagType: "green",
    description: "Card payment with no VPA, using Card Network + Last-4 as identity proxy.",
    expectedOutcome: "Card Last-4 + Network proxy matches customer record (+35% score boost).",
    projectedConfidence: "85% Auto-Match",
  },
  {
    id: "unmatched_review",
    title: "Unmatched Amount",
    amount: "1,250.00",
    subtitle: "Unknown Payer",
    method: "upi",
    vpa: "unknown@okicici",
    tag: "Zero-Guessing",
    tagType: "red",
    description: "No pending orders in ledger share this price.",
    expectedOutcome: "0 matching hypotheses safely intercepted into Manual Review queue without guessing.",
    projectedConfidence: "0% Manual Review",
  },
];

export default function SimulatePaymentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("kurta_collision");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card">("upi");
  const [rupees, setRupees] = useState("499");
  const [payerVpa, setPayerVpa] = useState("priya@okhdfcbank");
  const [cardLast4, setCardLast4] = useState("4242");
  const [cardNetwork, setCardNetwork] = useState("Visa");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  function selectPreset(preset: PresetScenario) {
    if (loading) return;
    setSelectedPreset(preset.id);
    setRupees(preset.amount.replace(",", ""));
    setPaymentMethod(preset.method);
    if (preset.vpa) setPayerVpa(preset.vpa);
    if (preset.cardLast4) setCardLast4(preset.cardLast4);
    if (preset.cardNetwork) setCardNetwork(preset.cardNetwork);
  }

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const parsedFloat = parseFloat(rupees.replace(/,/g, ""));
      const amountPaise = Math.round(parsedFloat * 100);
      if (isNaN(amountPaise) || amountPaise <= 0) {
        throw new Error("Please enter a valid rupee amount");
      }

      const payload: any = {
        amount: amountPaise,
        payment_method: paymentMethod,
      };

      if (paymentMethod === "upi") {
        payload.payer_vpa = payerVpa.trim() || undefined;
      } else {
        payload.payer_card_last4 = cardLast4.trim() || "4242";
        payload.payer_card_network = cardNetwork.trim() || "Visa";
      }

      const res = await fetch("/api/payments/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to simulate payment");
      }

      setIsOpen(false);
      setLoading(false);
      router.refresh();
      if (data.payment?.id) {
        router.push(`/dashboard/${data.payment.id}`);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  }

  const currentPreset = PRESETS.find((p) => p.id === selectedPreset);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs font-mono px-3.5 py-2 rounded-lg border border-line bg-paper text-ink hover:border-ink hover:text-ink transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] font-semibold tracking-tight"
      >
        Simulate Payment
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-line rounded-2xl w-full max-w-xl font-body shadow-2xl overflow-hidden animate-scaleIn transition-all">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-line bg-gradient-to-b from-paper/80 to-transparent flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-ink tracking-tight flex items-center gap-2">
                  <span>Simulate Incoming Payment</span>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-paper border border-line text-muted">
                    Sandbox Test
                  </span>
                </h3>
                <p className="text-xs text-muted font-body mt-0.5">
                  Test the complete matching, AI clarification and batch resolution engine offline.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !loading && setIsOpen(false)}
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
              <form onSubmit={handleSimulate} className="space-y-5">
                {error && (
                  <div className="p-3.5 rounded-xl bg-red/10 border border-red/20 text-red text-xs font-mono flex items-center gap-2.5 animate-fadeIn">
                    <svg className="w-4 h-4 text-red shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                      Select Scenario Preset
                    </label>
                    <span className="text-[11px] text-muted font-mono">1-click test scenarios</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {PRESETS.map((preset) => {
                      const isSelected = selectedPreset === preset.id;
                      const badgeStyle =
                        preset.tagType === "green"
                          ? "bg-green/10 text-green border-green/20"
                          : preset.tagType === "amber"
                          ? "bg-amber/10 text-amber border-amber/20"
                          : "bg-red/10 text-red border-red/20";

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          disabled={loading}
                          onClick={() => selectPreset(preset)}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between group disabled:opacity-50 ${
                            isSelected
                              ? "bg-paper border-ink shadow-xs ring-1 ring-ink"
                              : "bg-white border-line hover:border-ink/50 hover:bg-paper/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5 mb-1.5">
                            <div>
                              <span className="font-display font-bold text-sm text-ink block leading-none">
                                ₹{preset.amount}
                              </span>
                              <span className="font-mono text-[11px] text-muted block mt-1">
                                {preset.title}
                              </span>
                            </div>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold shrink-0 ${badgeStyle}`}>
                              {preset.tag}
                            </span>
                          </div>

                          <p className="text-[11px] text-muted leading-snug line-clamp-2 mt-1">
                            {preset.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expected Resolution Callout */}
                {currentPreset && (
                  <div className="p-3.5 rounded-xl bg-paper border border-line text-xs font-body flex items-start gap-3 transition-all">
                    <div className="w-2 h-2 rounded-full bg-ink/70 shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-semibold text-ink text-xs">
                          Expected Engine Behavior
                        </span>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-ink/10 text-ink">
                          {currentPreset.projectedConfidence}
                        </span>
                      </div>
                      <p className="text-muted text-xs leading-relaxed">
                        {currentPreset.expectedOutcome}
                      </p>
                    </div>
                  </div>
                )}

                {/* Payment Method & Parameters */}
                <div className="pt-4 border-t border-line space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
                      Transaction Parameters
                    </label>
                    {/* Method Segmented Control */}
                    <div className="inline-flex rounded-lg border border-line p-0.5 bg-paper font-mono text-xs shadow-2xs">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setPaymentMethod("upi")}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium disabled:opacity-50 ${
                          paymentMethod === "upi"
                            ? "bg-ink text-paper shadow-2xs font-bold"
                            : "text-muted hover:text-ink"
                        }`}
                      >
                        UPI App
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setPaymentMethod("card")}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium disabled:opacity-50 ${
                          paymentMethod === "card"
                            ? "bg-ink text-paper shadow-2xs font-bold"
                            : "text-muted hover:text-ink"
                        }`}
                      >
                        Debit / Credit Card
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Amount Input */}
                    <div>
                      <label className="block text-[11px] font-mono text-muted mb-1 font-medium">
                        Payment Amount (₹) *
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

                    {/* Method Parameters */}
                    {paymentMethod === "upi" ? (
                      <div>
                        <label className="block text-[11px] font-mono text-muted mb-1 font-medium">
                          Payer UPI ID (VPA)
                        </label>
                        <input
                          type="text"
                          disabled={loading}
                          value={payerVpa}
                          onChange={(e) => {
                            setPayerVpa(e.target.value);
                            setSelectedPreset("");
                          }}
                          placeholder="e.g. priya@okhdfcbank"
                          className="w-full font-mono text-xs px-3 py-2.5 bg-paper border border-line rounded-lg text-ink focus:outline-none focus:border-ink transition-colors disabled:opacity-60"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-mono text-muted mb-1 font-medium">
                          Card Last-4 &amp; Network
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={4}
                            disabled={loading}
                            value={cardLast4}
                            onChange={(e) => setCardLast4(e.target.value)}
                            placeholder="4242"
                            className="w-20 font-mono text-xs px-3 py-2.5 bg-paper border border-line rounded-lg text-ink focus:outline-none focus:border-ink font-bold disabled:opacity-60"
                          />
                          <select
                            value={cardNetwork}
                            disabled={loading}
                            onChange={(e) => setCardNetwork(e.target.value)}
                            className="flex-1 font-mono text-xs px-2.5 py-2.5 bg-paper border border-line rounded-lg text-ink focus:outline-none focus:border-ink disabled:opacity-60"
                          >
                            <option value="Visa">Visa</option>
                            <option value="MasterCard">MasterCard</option>
                            <option value="RuPay">RuPay</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-line">
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
                        <span>Processing Payment...</span>
                      </>
                    ) : (
                      <span>Simulate &amp; Process</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
