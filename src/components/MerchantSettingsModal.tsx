"use client";

import { useState, useEffect, useCallback } from "react";
import { MerchantRule } from "@/lib/types";

export interface MerchantSettings {
  autoThreshold: number; // 0.70 to 0.95 (default 0.85)
  approvalThreshold: number; // 0.40 to 0.75 (default 0.60)
  clarificationLanguage: "hinglish" | "english" | "hindi";
  staleDays: number; // default 7
}

const DEFAULT_SETTINGS: MerchantSettings = {
  autoThreshold: 0.85,
  approvalThreshold: 0.60,
  clarificationLanguage: "hinglish",
  staleDays: 7,
};

export default function MerchantSettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"thresholds" | "rules" | "expiry">("thresholds");
  const [settings, setSettings] = useState<MerchantSettings>(DEFAULT_SETTINGS);
  const [rules, setRules] = useState<MerchantRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  // New Rule Form State
  const [ruleName, setRuleName] = useState("");
  const [conditionType, setConditionType] = useState<"customer_name" | "payer_identity_hash" | "payer_vpa_hash" | "product_name" | "min_amount">("customer_name");
  const [conditionValue, setConditionValue] = useState("");
  const [signalWeight, setSignalWeight] = useState("0.15");
  const [ruleDetail, setRuleDetail] = useState("");
  const [isAddingRule, setIsAddingRule] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoadingRules(true);
    try {
      const res = await fetch("/api/merchant-rules");
      const data = await res.json();
      if (data.rules) setRules(data.rules);
    } catch {}
    finally {
      setLoadingRules(false);
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("kisne-bheja-merchant-settings");
    if (raw) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRules();
    }
  }, [isOpen, fetchRules]);

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem("kisne-bheja-merchant-settings", JSON.stringify(settings));
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      setIsOpen(false);
    }, 800);
  }

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault();
    if (!ruleName.trim() || !conditionValue.trim()) return;

    setIsAddingRule(true);
    try {
      const res = await fetch("/api/merchant-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule_name: ruleName.trim(),
          condition_type: conditionType,
          condition_value: conditionValue.trim(),
          signal_weight: parseFloat(signalWeight) || 0.15,
          detail: ruleDetail.trim() || undefined,
        }),
      });
      if (res.ok) {
        setRuleName("");
        setConditionValue("");
        setRuleDetail("");
        await fetchRules();
      }
    } catch {}
    finally {
      setIsAddingRule(false);
    }
  }

  async function handleToggleRule(id: string, currentActive: boolean) {
    try {
      await fetch(`/api/merchant-rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: !currentActive } : r))
      );
    } catch {}
  }

  async function handleDeleteRule(id: string) {
    try {
      await fetch(`/api/merchant-rules/${id}`, { method: "DELETE" });
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs font-mono px-3 py-1.5 rounded border border-line bg-paper text-ink hover:border-ink hover:text-ink transition-colors cursor-pointer flex items-center gap-1.5"
        title="Configure confidence thresholds, custom rules & expiry"
      >
        <svg className="w-3.5 h-3.5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>Settings</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white border border-line rounded-lg w-full max-w-xl p-6 font-body shadow-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-line">
              <div>
                <h3 className="font-display font-bold text-lg text-ink">Merchant Reconciliation Settings</h3>
                <p className="text-xs text-muted font-body mt-0.5">
                  Configure engine thresholds, custom rules & order expiry.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-ink font-mono text-sm cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-line mb-5 font-mono text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("thresholds")}
                className={`pb-2 px-2 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeTab === "thresholds"
                    ? "border-ink text-ink font-bold"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                Thresholds & Tone
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rules")}
                className={`pb-2 px-2 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeTab === "rules"
                    ? "border-ink text-ink font-bold"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                Custom Rules ({rules.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("expiry")}
                className={`pb-2 px-2 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeTab === "expiry"
                    ? "border-ink text-ink font-bold"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                Order Expiry
              </button>
            </div>

            {/* TAB 1: Thresholds */}
            {activeTab === "thresholds" && (
              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* Auto-Resolution Threshold */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-semibold text-ink uppercase tracking-wider">
                      Auto-Match Threshold
                    </label>
                    <span className="text-xs font-mono font-bold text-green tabular-nums">
                      {Math.round(settings.autoThreshold * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.70"
                    max="0.95"
                    step="0.01"
                    value={settings.autoThreshold}
                    onChange={(e) =>
                      setSettings({ ...settings, autoThreshold: parseFloat(e.target.value) })
                    }
                    className="w-full accent-ink cursor-pointer"
                  />
                  <p className="text-[11px] text-muted leading-relaxed">
                    Payments reaching this confidence level are fulfilled automatically without manual review.
                  </p>
                </div>

                {/* Merchant Review Threshold */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-semibold text-ink uppercase tracking-wider">
                      Merchant Approval Floor
                    </label>
                    <span className="text-xs font-mono font-bold text-amber tabular-nums">
                      {Math.round(settings.approvalThreshold * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.40"
                    max="0.75"
                    step="0.01"
                    value={settings.approvalThreshold}
                    onChange={(e) =>
                      setSettings({ ...settings, approvalThreshold: parseFloat(e.target.value) })
                    }
                    className="w-full accent-ink cursor-pointer"
                  />
                  <p className="text-[11px] text-muted leading-relaxed">
                    Payments between this score and the auto-match threshold are queued for your 1-click confirmation. Below this triggers in-dashboard AI decision framing.
                  </p>
                </div>

                {/* AI Framing Language */}
                <div className="space-y-2 pt-2 border-t border-line">
                  <label className="block text-xs font-mono font-semibold text-ink uppercase tracking-wider mb-1">
                    AI Clarification Framing Language
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    {(["hinglish", "english", "hindi"] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setSettings({ ...settings, clarificationLanguage: lang })}
                        className={`py-2 px-3 rounded border text-center transition-colors cursor-pointer capitalize ${
                          settings.clarificationLanguage === lang
                            ? "bg-ink text-paper border-ink font-bold"
                            : "bg-paper text-muted border-line hover:border-ink hover:text-ink"
                        }`}
                      >
                        {lang === "hinglish" ? "Hinglish (Default)" : lang}
                      </button>
                    ))}
                  </div>
                </div>

                {savedNotice && (
                  <div className="text-xs text-green font-mono bg-green/10 p-2 rounded border border-green/20 text-center animate-fadeIn">
                    ✓ Preferences saved successfully!
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-mono px-3 py-2 rounded text-muted hover:text-ink transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-mono font-medium px-4 py-2 bg-ink text-paper rounded hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    Save Preferences
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Custom Merchant Rules */}
            {activeTab === "rules" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-ink mb-1">
                    Active Custom Rules
                  </h4>
                  <p className="text-xs text-muted mb-3">
                    Rules run after fixed engine signals, appending one more weighted evidence row to candidate scores.
                  </p>

                  {loadingRules ? (
                    <div className="text-xs text-muted py-4">Loading rules...</div>
                  ) : rules.length === 0 ? (
                    <div className="text-xs text-muted py-3 bg-paper p-3 rounded border border-line">
                      No custom rules defined yet. Add one below!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rules.map((rule) => (
                        <div
                          key={rule.id}
                          className={`p-3 rounded border transition-colors flex items-center justify-between gap-3 text-xs ${
                            rule.is_active ? "bg-white border-line" : "bg-paper/50 border-line/60 opacity-60"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold text-ink flex items-center gap-2">
                              <span>{rule.rule_name}</span>
                              <span
                                className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  rule.signal_weight >= 0
                                    ? "bg-green/10 text-green border border-green/20"
                                    : "bg-red/10 text-red border border-red/20"
                                }`}
                              >
                                {rule.signal_weight >= 0 ? `+${Math.round(rule.signal_weight * 100)}%` : `${Math.round(rule.signal_weight * 100)}%`}
                              </span>
                            </div>
                            <div className="text-muted text-[11px] font-mono">
                              When <span className="text-ink">{rule.condition_type}</span> contains &ldquo;{rule.condition_value}&rdquo;
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleRule(rule.id, rule.is_active)}
                              className={`text-[11px] font-mono px-2 py-1 rounded border cursor-pointer ${
                                rule.is_active
                                  ? "bg-ink text-paper border-ink"
                                  : "bg-paper text-muted border-line hover:text-ink"
                              }`}
                            >
                              {rule.is_active ? "Active" : "Disabled"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule.id)}
                              className="text-muted hover:text-red p-1 text-xs cursor-pointer"
                              title="Delete rule"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Rule Form */}
                <form onSubmit={handleAddRule} className="pt-4 border-t border-line space-y-3 bg-paper/60 p-4 rounded-lg">
                  <div className="font-mono text-xs font-bold text-ink uppercase tracking-wider">
                    + Add New Custom Rule
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-muted mb-1">Rule Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VIP Repeat Buyer Bonus"
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      className="w-full text-xs font-body px-3 py-1.5 bg-white border border-line rounded focus:outline-none focus:border-ink"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-mono text-muted mb-1">Condition *</label>
                      <select
                        value={conditionType}
                        onChange={(e: any) => setConditionType(e.target.value)}
                        className="w-full text-xs font-mono px-2 py-1.5 bg-white border border-line rounded focus:outline-none focus:border-ink"
                      >
                        <option value="customer_name">Customer Name Contains</option>
                        <option value="product_name">Product Name Contains</option>
                        <option value="payer_identity_hash">Payer Identity Hash Equals</option>
                        <option value="min_amount">Min Amount (Paise &ge;)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-muted mb-1">Condition Value *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Priya Sharma"
                        value={conditionValue}
                        onChange={(e) => setConditionValue(e.target.value)}
                        className="w-full text-xs font-body px-3 py-1.5 bg-white border border-line rounded focus:outline-none focus:border-ink"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-muted mb-1">
                      Evidence Weight Signal Boost:{" "}
                      <span className="font-mono font-bold text-ink">
                        {parseFloat(signalWeight) >= 0 ? `+${Math.round(parseFloat(signalWeight) * 100)}%` : `${Math.round(parseFloat(signalWeight) * 100)}%`}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="-0.30"
                      max="0.30"
                      step="0.05"
                      value={signalWeight}
                      onChange={(e) => setSignalWeight(e.target.value)}
                      className="w-full accent-ink cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-muted mb-1">Detail / Explanation Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Known repeat buyer loyalty boost"
                      value={ruleDetail}
                      onChange={(e) => setRuleDetail(e.target.value)}
                      className="w-full text-xs font-body px-3 py-1.5 bg-white border border-line rounded focus:outline-none focus:border-ink"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isAddingRule || !ruleName.trim() || !conditionValue.trim()}
                      className="text-xs font-mono font-medium px-4 py-1.5 bg-ink text-paper rounded hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {isAddingRule ? "Saving Rule..." : "Create Custom Rule"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: Order Expiry */}
            {activeTab === "expiry" && (
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-semibold text-ink uppercase tracking-wider">
                      Auto-Cancel Stale Pending Orders
                    </label>
                    <span className="text-xs font-mono font-bold text-ink tabular-nums">
                      {settings.staleDays} days
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={settings.staleDays}
                    onChange={(e) =>
                      setSettings({ ...settings, staleDays: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-ink cursor-pointer"
                  />
                  <p className="text-xs text-muted leading-relaxed">
                    Pending orders older than <strong className="text-ink">{settings.staleDays} days</strong> without payment are automatically marked as cancelled when the dashboard loads. They are excluded from candidate matching and displayed under the &ldquo;Cancelled&rdquo; filter.
                  </p>
                </div>

                {savedNotice && (
                  <div className="text-xs text-green font-mono bg-green/10 p-2 rounded border border-green/20 text-center animate-fadeIn">
                    ✓ Expiry preferences saved!
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-mono px-3 py-2 rounded text-muted hover:text-ink transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-mono font-medium px-4 py-2 bg-ink text-paper rounded hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    Save Setting
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
