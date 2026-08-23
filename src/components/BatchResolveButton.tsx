"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BatchResolveButton({ unresolvedCount }: { unresolvedCount: number }) {
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handleBatchResolve() {
    setLoading(true);
    setResultMsg(null);
    try {
      const res = await fetch("/api/batch-resolve", { method: "POST" });
      const data = await res.json();
      if (data.pairs_resolved?.length > 0) {
        setResultMsg(`Matched ${data.pairs_resolved.length} payment${data.pairs_resolved.length === 1 ? "" : "s"} at once!`);
      } else {
        setResultMsg("No same-price payments waiting to be untangled right now.");
      }
      router.refresh();
    } catch {
      setResultMsg("Could not match payments right now.");
    } finally {
      setLoading(false);
    }
  }

  if (unresolvedCount === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleBatchResolve}
        disabled={loading}
        className="text-xs font-mono px-3 py-1.5 rounded border border-line bg-paper text-ink hover:border-ink disabled:opacity-50 cursor-pointer transition-colors flex items-center gap-1.5"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green" />
        <span>{loading ? "Matching payments..." : "Match multiple payments"}</span>
      </button>

      {resultMsg && (
        <span className="text-xs font-mono text-muted animate-fadeIn">
          {resultMsg}
        </span>
      )}
    </div>
  );
}
