"use client";

import { useEffect, useState } from "react";
import { TimelineItem } from "@/lib/audit";

interface LiveAuditTimelineProps {
  paymentId: string;
  initialTimeline: TimelineItem[];
  paymentStatus: string;
}

export default function LiveAuditTimeline({
  paymentId,
  initialTimeline,
  paymentStatus,
}: LiveAuditTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>(initialTimeline);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/${paymentId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.timeline) {
          setTimeline(data.timeline);
        }
      } catch {
        // silent
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentId]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold">Audit & Resolution Timeline</h2>
        <span className="text-xs text-muted font-mono">{timeline.length} Events</span>
      </div>

      <div className="bg-white border border-line rounded-lg p-5 font-mono text-xs divide-y divide-line/60 shadow-xs">
        {timeline.length === 0 ? (
          <div className="text-muted">No timeline entries found.</div>
        ) : (
          timeline.map((item) => (
            <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3 animate-fadeIn">
              <span className="text-muted shrink-0 text-[11px]">{item.timeStr}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] shrink-0 font-bold ${
                  item.actor === "system"
                    ? "bg-line text-ink"
                    : item.actor === "gemini"
                    ? "bg-amber/15 text-amber"
                    : item.actor === "merchant"
                    ? "bg-green/15 text-green"
                    : "bg-line text-muted"
                }`}
              >
                {item.actor.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-ink uppercase text-[11px] mr-2">
                  {item.title}:
                </span>
                <span className="text-muted break-words">{item.detail}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
