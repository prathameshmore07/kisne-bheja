"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { statusColor, statusLabel, formatRupees } from "@/lib/format";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";
import CandidateEvidenceCard, { CandidateItem } from "@/components/CandidateEvidenceCard";
import TopTwoComparisonCard from "@/components/TopTwoComparisonCard";
import { PaymentStatus } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

interface PaymentState {
  id: string;
  status: string;
  confidence: number;
  amount: number;
  resolved_order_id?: string | null;
}

export interface BatchResolutionState {
  isBatchResolved: boolean;
  siblingPayment: {
    id: string;
    amount: number;
    productName?: string;
    received_at: number;
  } | null;
}

const SETTLED_STATUSES = ["resolved", "manual_review"];
const POLL_MS = 2000;

export default function LiveConfidence({
  paymentId,
  initialPayment,
  initialCandidates,
  initialBatchResolution,
}: {
  paymentId: string;
  initialPayment: PaymentState;
  initialCandidates: CandidateItem[];
  initialBatchResolution?: BatchResolutionState | null;
}) {
  const [payment, setPayment] = useState<PaymentState>(initialPayment);
  const [candidates, setCandidates] = useState<CandidateItem[]>(initialCandidates);
  const [batchResolution, setBatchResolution] = useState<BatchResolutionState | null>(initialBatchResolution ?? null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animatedTopPct = useAnimatedNumber(Math.round(payment.confidence * 100));

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments/${paymentId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setPayment(data.payment);
      setCandidates(data.candidates);
      if (data.batchResolution !== undefined) {
        setBatchResolution(data.batchResolution);
      }
    } catch {
      // silent
    }
  }, [paymentId]);

  // Instant sync on local payment actions
  useEffect(() => {
    const handleSync = (e: any) => {
      if (!e.detail || e.detail.paymentId === paymentId) {
        refetch();
      }
    };
    window.addEventListener("payment-updated", handleSync);
    return () => {
      window.removeEventListener("payment-updated", handleSync);
    };
  }, [paymentId, refetch]);

  // Supabase Realtime push subscriptions
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let channel: any = null;

    if (supabase) {
      channel = supabase
        .channel(`payment-live-${paymentId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "payments",
            filter: `id=eq.${paymentId}`,
          },
          () => {
            refetch();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "evidence_log",
            filter: `payment_id=eq.${paymentId}`,
          },
          () => {
            refetch();
          }
        )
        .subscribe();
    } else {
      // Fallback polling when browser client is not active
      if (!SETTLED_STATUSES.includes(payment.status)) {
        intervalRef.current = setInterval(refetch, POLL_MS);
      }
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [paymentId, payment.status, refetch]);

  async function handleApprove(orderId: string) {
    setBusyOrderId(orderId);
    try {
      await fetch(`/api/payments/${paymentId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      await refetch();
    } finally {
      setBusyOrderId(null);
    }
  }

  async function handleReject(orderId: string) {
    setBusyOrderId(orderId);
    try {
      await fetch(`/api/payments/${paymentId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      await refetch();
    } finally {
      setBusyOrderId(null);
    }
  }

  async function handleUnlink() {
    setBusyOrderId("unlink");
    try {
      await fetch(`/api/payments/${paymentId}/unlink`, { method: "POST" });
      await refetch();
    } finally {
      setBusyOrderId(null);
    }
  }

  const showActions = payment.status === "ambiguous" || payment.status === "manual_review";
  const color = statusColor(payment.status as PaymentStatus);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-xs uppercase tracking-wide text-muted font-mono">Why we think this</div>
        <div className="flex items-center gap-3">
          <div
            className="text-sm font-body px-3 py-1.5 rounded transition-colors duration-500 tabular-nums font-medium"
            style={{ color, backgroundColor: `${color}1A` }}
          >
            {statusLabel(payment.status as PaymentStatus)} · {Math.round(animatedTopPct)}%
          </div>
          {payment.status === "resolved" && (
            <button
              onClick={handleUnlink}
              disabled={busyOrderId === "unlink"}
              className="text-xs font-mono underline text-red disabled:opacity-50 cursor-pointer"
            >
              {busyOrderId === "unlink" ? "Unlinking..." : "Wrong match? Unlink"}
            </button>
          )}
        </div>
      </div>

      {batchResolution?.isBatchResolved && (
        <div className="mb-6 p-4 rounded-lg border border-green/20 bg-green/5 font-body text-xs text-ink animate-fadeIn">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-green inline-block shrink-0" />
            <span className="font-mono uppercase tracking-wider text-[11px] font-bold text-green">
              Resolved together with another payment
            </span>
          </div>
          <p className="leading-relaxed text-ink text-sm">
            Another payment of {formatRupees(payment.amount)} arrived around the same time. Instead of guessing on each payment independently, Kisne Bheja worked out both assignments together so neither order was confused for the other.
          </p>
          {batchResolution.siblingPayment && (
            <div className="mt-2.5 pt-2.5 border-t border-line/60 flex items-center justify-between text-xs font-mono">
              <span className="text-muted">Paired with sibling payment:</span>
              <a
                href={`/dashboard/${batchResolution.siblingPayment.id}`}
                className="font-semibold text-ink underline hover:text-green flex items-center gap-1 transition-colors"
              >
                <span>
                  {formatRupees(batchResolution.siblingPayment.amount)}
                  {batchResolution.siblingPayment.productName ? ` · ${batchResolution.siblingPayment.productName}` : ""}
                </span>
                <span>→</span>
              </a>
            </div>
          )}
        </div>
      )}

      {candidates.length >= 2 && (
        <TopTwoComparisonCard candidateA={candidates[0]} candidateB={candidates[1]} />
      )}

      {candidates.length === 0 && (
        <div className="text-sm text-muted font-body">No pending orders found with this exact amount.</div>
      )}

      <div className="space-y-6">
        {candidates.map((candidate, idx) => (
          <CandidateEvidenceCard
            key={candidate.order_id}
            paymentId={paymentId}
            candidate={candidate}
            isBest={idx === 0}
            color={color}
            showActions={showActions}
            busy={busyOrderId === candidate.order_id}
            onApprove={() => handleApprove(candidate.order_id)}
            onReject={() => handleReject(candidate.order_id)}
          />
        ))}
      </div>
    </div>
  );
}
