"use client";

import { useState, useEffect } from "react";
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
  description: string;
  expectedOutcome: string;
}

const PRESETS: PresetScenario[] = [
  {
    id: "kurta_collision_priya",
    title: "UPI: Priya Sharma",
    amount: "499.00",
    subtitle: "Blue Kurta (₹499)",
    method: "upi",
    vpa: "priya.sharma@okhdfcbank",
    tag: "UPI Collision",
    description: "Two orders share ₹499. Paying with Priya's UPI matches past customer history.",
    expectedOutcome: "Payer VPA hash matches Priya Sharma record (+35% score boost -> auto-resolves to Blue Kurta).",
  },
  {
    id: "kurta_collision_aman",
    title: "UPI: Aman Verma",
    amount: "499.00",
    subtitle: "Red Kurta (₹499)",
    method: "upi",
    vpa: "aman.verma@okaxis",
    tag: "UPI Collision",
    description: "Two orders share ₹499. Paying with Aman's UPI matches past customer history.",
    expectedOutcome: "Payer VPA hash matches Aman Verma record (+35% score boost -> auto-resolves to Red Kurta).",
  },
  {
    id: "yoga_unique",
    title: "UPI: Single Match",
    amount: "799.00",
    subtitle: "Yoga Mat - Black",
    method: "upi",
    vpa: "neha.gupta@paytm",
    tag: "Clean Match",
    description: "One single pending order exists in catalog with this exact price.",
    expectedOutcome: "Exact price and timing match triggers swift auto-match or 1-tap confirmation.",
  },
  {
    id: "card_payment",
    title: "Card: Visa Proxy",
    amount: "649.00",
    subtitle: "Green Kurta (₹649)",
    method: "card",
    cardLast4: "4242",
    cardNetwork: "Visa",
    tag: "Card Proxy",
    description: "Card payment with no VPA, using Card Network + Last-4 as identity proxy.",
    expectedOutcome: "Card Last-4 + Network proxy matches customer record (+35% score boost).",
  },
  {
    id: "unmatched_review",
    title: "Unmatched Amount",
    amount: "1250.00",
    subtitle: "Unknown Amount",
    method: "upi",
    vpa: "unknown@okicici",
    tag: "Zero-Guessing",
    description: "No pending orders in catalog share this price.",
    expectedOutcome: "Zero matching candidates safely routed to Needs Review queue without guessing.",
  },
];

export default function CreatePaymentLinkModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("kurta_collision_priya");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card">("upi");
  const [rupees, setRupees] = useState("499");
  const [payerVpa, setPayerVpa] = useState("priya.sharma@okhdfcbank");
  const [description, setDescription] = useState("Kisne Bheja Live Test Payment");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<{
    id: string;
    short_url: string;
    upi_link?: string;
    key_id?: string;
    auth_warning?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  // Load Razorpay Checkout.js script dynamically
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  function selectPreset(preset: PresetScenario) {
    if (loading) return;
    setSelectedPreset(preset.id);
    setRupees(preset.amount.replace(",", ""));
    setPaymentMethod(preset.method);
    if (preset.vpa) setPayerVpa(preset.vpa);
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
          customerVpa: paymentMethod === "upi" ? payerVpa.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to create Razorpay payment link");
      }

      setGeneratedLink({
        id: data.id,
        short_url: data.short_url,
        upi_link: data.upi_link,
        key_id: data.key_id,
        auth_warning: data.auth_warning,
      });
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to generate payment link");
      setLoading(false);
    }
  }

  function launchRazorpayCheckout() {
    if (typeof window === "undefined" || !(window as any).Razorpay) {
      if (generatedLink?.short_url) {
        window.open(generatedLink.short_url, "_blank");
      }
      return;
    }

    const parsedFloat = parseFloat(rupees.replace(/,/g, ""));
    const amountPaise = Math.round(parsedFloat * 100);

    const options = {
      key: generatedLink?.key_id || "rzp_test_TSp280vD1KUNbi",
      amount: amountPaise,
      currency: "INR",
      name: "Kisne Bheja Store",
      description: description,
      prefill: {
        vpa: paymentMethod === "upi" ? payerVpa : undefined,
        contact: "9876543210",
        email: "merchant.test@kisnebheja.in",
      },
      theme: {
        color: "#1B1D22",
      },
      modal: {
        ondismiss: function () {
          router.refresh();
        },
      },
      handler: function (response: any) {
        console.log("Razorpay payment completed on client:", response);
        // Close modal and refresh dashboard after short wait for webhook processing
        setIsOpen(false);
        setTimeout(() => {
          router.refresh();
        }, 1200);
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleResetModal() {
    setIsOpen(false);
    setGeneratedLink(null);
    setError(null);
    router.refresh();
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
        className="text-xs font-mono px-3.5 py-2 rounded-lg border border-line bg-paper text-ink hover:border-ink hover:text-ink transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] font-semibold tracking-tight flex items-center gap-1.5"
      >
        <span>Test Payment (Razorpay UPI &amp; Cards)</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111827] border border-line rounded-2xl w-full max-w-xl font-body shadow-2xl overflow-hidden animate-scaleIn transition-all">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-line bg-gradient-to-b from-paper/80 to-transparent flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-ink tracking-tight flex items-center gap-2">
                  <span>Create Live Razorpay Payment</span>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    UPI + Card Test Mode
                  </span>
                </h3>
                <p className="text-xs text-muted font-body mt-1">
                  Generate a real Razorpay test-mode transaction. Pay via UPI (GPay, PhonePe, Paytm, UPI ID) or Card to deliver a verified webhook.
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
                /* Success State: Payment Ready */
                <div className="space-y-5 animate-fadeIn">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-ink">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-display font-bold text-sm text-emerald-700 dark:text-emerald-300">
                          Razorpay Payment Ready (₹{rupees})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        {paymentMethod === "upi" ? "UPI Flow" : "Card Flow"}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Complete payment below using Razorpay test credentials. When captured, Razorpay delivers a verified HMAC webhook to <code className="font-mono text-[11px] bg-paper px-1 py-0.5 rounded">/api/webhook</code> to match the transaction.
                    </p>
                  </div>

                  {/* Auth / Server Warning banner if present */}
                  {generatedLink.auth_warning && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-mono flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">ℹ</span>
                      <span>{generatedLink.auth_warning}. Direct Razorpay Checkout Modal below is ready for live test payments.</span>
                    </div>
                  )}

                  {/* Primary Action: Direct Razorpay Checkout Modal */}
                  <div className="p-4 rounded-xl bg-paper border border-line space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-ink uppercase tracking-wider">
                        Live Checkout Options
                      </span>
                      <span className="text-[11px] font-mono text-muted">Supports UPI &amp; Cards</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Button 1: Launch Razorpay Popup */}
                      <button
                        type="button"
                        onClick={launchRazorpayCheckout}
                        className="p-3.5 rounded-xl bg-ink text-paper hover:opacity-90 active:scale-[0.98] transition-all font-mono text-xs font-bold cursor-pointer shadow-xs flex flex-col items-center justify-center text-center gap-1"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">⚡</span>
                          <span>Pay with Razorpay Modal</span>
                        </div>
                        <span className="text-[10px] opacity-75 font-normal">
                          Opens UPI (GPay/PhonePe) &amp; Card popup
                        </span>
                      </button>

                      {/* Button 2: Open External Link */}
                      <a
                        href={generatedLink.short_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3.5 rounded-xl bg-white dark:bg-[#0B0F17] border border-line hover:border-ink text-ink font-mono text-xs font-bold transition-all flex flex-col items-center justify-center text-center gap-1 shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Open Hosted Link</span>
                          <span>↗</span>
                        </div>
                        <span className="text-[10px] text-muted font-normal">
                          Opens rzp.io checkout in new tab
                        </span>
                      </a>
                    </div>
                  </div>

                  {/* Published Test Credentials Helper */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#0B0F17] border border-line text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-ink text-[11px] uppercase tracking-wide">
                        Click to Copy Test Credentials
                      </span>
                      <span className="text-[10px] text-muted font-mono">Real Razorpay Test Mode</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px]">
                      {/* UPI Option */}
                      <button
                        type="button"
                        onClick={() => handleCopy(payerVpa || "priya.sharma@okhdfcbank")}
                        className="p-2.5 rounded-lg bg-paper border border-line hover:border-ink text-left transition-colors cursor-pointer group"
                      >
                        <div className="text-muted text-[10px] flex items-center justify-between">
                          <span>Test UPI ID</span>
                          <span className="text-[9px] group-hover:text-ink">Copy</span>
                        </div>
                        <div className="font-bold text-ink mt-0.5 truncate">{payerVpa || "success@razorpay"}</div>
                        <div className="text-[10px] text-muted mt-0.5">Select UPI in modal → paste</div>
                      </button>

                      {/* Card Option */}
                      <button
                        type="button"
                        onClick={() => handleCopy("4111222233334444")}
                        className="p-2.5 rounded-lg bg-paper border border-line hover:border-ink text-left transition-colors cursor-pointer group"
                      >
                        <div className="text-muted text-[10px] flex items-center justify-between">
                          <span>Test Card (Visa)</span>
                          <span className="text-[9px] group-hover:text-ink">Copy</span>
                        </div>
                        <div className="font-bold text-ink mt-0.5">4111 2222 3333 4444</div>
                        <div className="text-[10px] text-muted mt-0.5">Expiry: 12/28 · CVV: 123</div>
                      </button>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 flex items-center justify-between border-t border-line">
                    <button
                      type="button"
                      onClick={() => setGeneratedLink(null)}
                      className="text-xs font-mono text-muted hover:text-ink underline cursor-pointer"
                    >
                      ← Create another payment
                    </button>
                    <button
                      type="button"
                      onClick={handleResetModal}
                      className="px-4 py-2 rounded-lg border border-line text-ink hover:border-ink font-mono text-xs font-medium cursor-pointer"
                    >
                      Done &amp; View Ledger
                    </button>
                  </div>
                </div>
              ) : (
                /* Form State: Select Scenario & Configure Parameters */
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
                      <span className="text-[11px] text-muted font-mono">UPI &amp; Card Scenarios</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
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
                                {preset.method}
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
                        <div className="font-semibold text-ink text-xs mb-0.5">
                          Engine Prediction
                        </div>
                        <p className="text-muted text-xs leading-relaxed">
                          {currentPreset.expectedOutcome}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Parameters */}
                  <div className="pt-4 border-t border-line space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
                        Payment Parameters
                      </label>
                      {/* Method Toggle */}
                      <div className="inline-flex rounded-lg border border-line p-0.5 bg-paper font-mono text-xs">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => setPaymentMethod("upi")}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium disabled:opacity-50 ${
                            paymentMethod === "upi"
                              ? "bg-ink text-paper font-bold shadow-2xs"
                              : "text-muted hover:text-ink"
                          }`}
                        >
                          UPI App / VPA
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => setPaymentMethod("card")}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium disabled:opacity-50 ${
                            paymentMethod === "card"
                              ? "bg-ink text-paper font-bold shadow-2xs"
                              : "text-muted hover:text-ink"
                          }`}
                        >
                          Debit / Credit Card
                        </button>
                      </div>
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

                      {paymentMethod === "upi" ? (
                        <div>
                          <label className="block text-[11px] font-mono text-muted mb-1 font-medium">
                            Payer UPI VPA
                          </label>
                          <input
                            type="text"
                            disabled={loading}
                            value={payerVpa}
                            onChange={(e) => {
                              setPayerVpa(e.target.value);
                              setSelectedPreset("");
                            }}
                            placeholder="e.g. priya.sharma@okhdfcbank"
                            className="w-full font-mono text-xs px-3 py-2.5 bg-paper border border-line rounded-lg text-ink focus:outline-none focus:border-ink transition-colors disabled:opacity-60"
                          />
                        </div>
                      ) : (
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
                      )}
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
