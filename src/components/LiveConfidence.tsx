"use client";

import { useEffect, useRef, useState } from "react";
import { statusColor, statusLabel } from "@/lib/format";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";
import CandidateEvidenceCard, { CandidateItem } from "@/components/CandidateEvidenceCard";
import { PaymentStatus } from "@/lib/types";

interface PaymentState {
  id: string;
  status: string;
  confidence: number;
  amount: number;
  resolved_order_id?: string | null;
}

const SETTLED_STATUSES = ["resolved", "manual_review"];
const POLL_MS = 1000;

export default function LiveConfidence({
  paymentId,
  initialPayment,
  initialCandidates,
}: {
  paymentId: string;
  initialPayment: PaymentState;
  initialCandidates: CandidateItem[];
}) {
  const [payment, setPayment] = useState<PaymentState>(initialPayment);
  const [candidates, setCandidates] = useState<CandidateItem[]>(initialCandidates);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animatedTopPct = useAnimatedNumber(Math.round(payment.confidence * 100));

  async function refetch() {
    try {
      const res = await fetch(`/api/payments/${paymentId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setPayment(data.payment);
      setCandidates(data.candidates);
      if (SETTLED_STATUSES.includes(data.payment.status) && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    } catch {
      // silent — next poll retries
    }
  }

  useEffect(() => {
    if (!SETTLED_STATUSES.includes(payment.status)) {
      intervalRef.current = setInterval(refetch, POLL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

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
