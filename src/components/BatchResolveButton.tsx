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
        setResultMsg(`Untangled ${data.pairs_resolved.length} payment${data.pairs_resolved.length === 1 ? "" : "s"} simultaneously!`);
      } else {
        setResultMsg("No multi-payment collision clusters ready for joint assignment.");
      }
      router.refresh();
    } catch {
      setResultMsg("Batch resolution failed.");
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
        className="text-xs font-mono px-3 py-1.5 rounded bg-ink text-paper hover:opacity-90 disabled:opacity-50 cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green" />
        <span>{loading ? "Untangling joint assignments..." : "Run Joint Batch Assignment"}</span>
      </button>

      {resultMsg && (
        <span className="text-xs font-mono text-muted animate-fadeIn">
          {resultMsg}
        </span>
      )}
    </div>
  );
}
