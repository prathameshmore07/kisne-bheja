"use client";

import { useState } from "react";

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
    expectedOutcome: "Tests tie-breaking logic and single-turn customer clarification.",
  },
  {
    id: "yoga_unique",
    title: "Single Candidate",
    amount: "799.00",
    subtitle: "Yoga Mat - Black",
    tag: "Clean Match",
    description: "One single pending order exists with this exact amount.",
    expectedOutcome: "Exact price and timing match triggers swift auto-match or 1-tap confirmation.",
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

export default function CreatePaymentLinkModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("kurta_collision");
  const [rupees, setRupees] = useState("499");
  const [description, setDescription] = useState("Kisne Bheja Live Test Payment");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<{ id: string; short_url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function selectPreset(preset: PresetScenario) {
    if (loading) return;
    setSelectedPreset(preset.id);
    setRupees(preset.amount.replace(",", ""));
    setDescription(`Test Payment: ${preset.title} (₹${preset.amount})`);
    setGeneratedLink(null);
  }

  async function handleCreateLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const parsedFloat = parseFloat(rupees.replace(/,/g, ""));
      const amountPaise = Math.round(parsedFloat * 100);
      if (isNaN(amountPaise) || amountPaise <= 0) {
        throw new Error("Please enter a valid rupee amount");
      }

      const res = await fetch("/api/create-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          description: description.trim() || "Kisne Bheja Test Payment",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to create Razorpay payment link");
      }

      setGeneratedLink({
        id: data.id,
        short_url: data.short_url,
      });
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to generate payment link");
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!generatedLink?.short_url) return;
    navigator.clipboard.writeText(generatedLink.short_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleResetModal() {
    setIsOpen(false);
    setGeneratedLink(null);
    setError(null);
  }

  const currentPreset = PRESETS.find((p) => p.id === selectedPreset);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setGeneratedLink(null);
          setError(null);
          setIsOpen(true);
        }}
        className="text-xs font-mono px-3.5 py-2 rounded-lg border border-line bg-paper text-ink hover:border-ink hover:text-ink transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] font-semibold tracking-tight"
      >
        Test Payment (Razorpay)
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111827] border border-line rounded-2xl w-full max-w-xl font-body shadow-2xl overflow-hidden animate-scaleIn transition-all">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-line bg-gradient-to-b from-paper/80 to-transparent flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-ink tracking-tight flex items-center gap-2">
                  <span>Create Live Razorpay Payment Link</span>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Test Mode
                  </span>
                </h3>
                <p className="text-xs text-muted font-body mt-1">
                  Generate a genuine Razorpay payment link. Complete payment in test mode to deliver a real webhook to the matching pipeline.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetModal}
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
              {generatedLink ? (
                /* Success State: Payment Link Generated */
                <div className="space-y-5 animate-fadeIn">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-ink">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-display font-bold text-sm text-emerald-700 dark:text-emerald-300">
                        Razorpay Payment Link Ready
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Pay using Razorpay test credentials. When captured, Razorpay delivers a verified webhook to <code className="font-mono text-[11px] bg-paper px-1 py-0.5 rounded">/api/webhook</code> which ingests and resolves the transaction.
                    </p>
                  </div>

                  {/* Checkout URL Box */}
                  <div>
                    <label className="block text-[11px] font-mono text-muted mb-1.5 font-bold uppercase tracking-wider">
                      Checkout URL (Test Mode)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedLink.short_url}
                        className="flex-1 font-mono text-xs px-3 py-2.5 bg-paper border border-line rounded-lg text-ink select-all focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="px-3.5 py-2.5 rounded-lg border border-line bg-paper text-ink hover:border-ink font-mono text-xs font-semibold cursor-pointer transition-all shrink-0"
                      >
                        {copied ? "Copied!" : "Copy Link"}
                      </button>
                      <a
                        href={generatedLink.short_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-lg bg-ink text-paper hover:opacity-90 font-mono text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-xs"
                      >
                        <span>Open Checkout</span>
                        <span>↗</span>
                      </a>
                    </div>
                  </div>

                  {/* Razorpay Test Credentials Guide */}
                  <div className="p-4 rounded-xl bg-paper border border-line text-xs space-y-2.5">
                    <div className="font-mono font-bold text-ink text-[11px] uppercase tracking-wide">
                      Published Razorpay Test Credentials
                    </div>
                    <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#0B0F17] border border-line">
                        <div className="text-muted text-[10px]">Test UPI (Success)</div>
                        <div className="font-bold text-ink mt-0.5">success@razorpay</div>
                        <div className="text-[10px] text-muted mt-0.5">or any UPI ID in test mode</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#0B0F17] border border-line">
                        <div className="text-muted text-[10px]">Test Visa / RuPay Card</div>
                        <div className="font-bold text-ink mt-0.5">4111 2222 3333 4444</div>
                        <div className="text-[10px] text-muted mt-0.5">Expiry: 12/28 · CVV: 123</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 flex items-center justify-between border-t border-line">
                    <button
                      type="button"
                      onClick={() => setGeneratedLink(null)}
                      className="text-xs font-mono text-muted hover:text-ink underline cursor-pointer"
                    >
                      ← Create another payment link
                    </button>
                    <button
                      type="button"
                      onClick={handleResetModal}
                      className="px-4 py-2 rounded-lg border border-line text-ink hover:border-ink font-mono text-xs font-medium cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* Form State: Select Scenario & Create Link */
                <form onSubmit={handleCreateLink} className="space-y-5">
                  {error && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-mono flex items-center gap-2.5 animate-fadeIn">
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
                        Select Test Scenario
                      </label>
                      <span className="text-[11px] text-muted font-mono">1-click test link creation</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {PRESETS.map((preset) => {
                        const isSelected = selectedPreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            disabled={loading}
                            onClick={() => selectPreset(preset)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between group disabled:opacity-50 ${
                              isSelected
                                ? "bg-paper border-ink shadow-xs ring-1 ring-ink"
                                : "bg-white dark:bg-[#0B0F17] border-line hover:border-ink/50 hover:bg-paper/40"
                            }`}
                          >
                            <div>
                              <span className="font-display font-bold text-sm text-ink block leading-none">
                                ₹{preset.amount}
                              </span>
                              <span className="font-mono text-[11px] text-muted block mt-1">
                                {preset.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-muted mt-2 block line-clamp-1">
                              {preset.tag}
                            </span>
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
                        <div className="font-semibold text-ink text-xs mb-0.5">
                          Scenario Target
                        </div>
                        <p className="text-muted text-xs leading-relaxed">
                          {currentPreset.description} {currentPreset.expectedOutcome}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Parameters */}
                  <div className="pt-4 border-t border-line space-y-3">
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
                  <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-line">
                    <button
                      type="button"
                      onClick={handleResetModal}
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
                          <span>Creating Razorpay Link...</span>
                        </>
                      ) : (
                        <span>Generate Razorpay Link →</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
