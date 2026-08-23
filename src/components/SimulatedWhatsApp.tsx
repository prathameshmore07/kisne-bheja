"use client";

import { useState, useEffect } from "react";
import { ChatMessage, PaymentStatus } from "@/lib/types";

interface SimulatedWhatsAppProps {
  paymentId: string;
  initialChat: ChatMessage[];
  paymentStatus: PaymentStatus;
}

export default function SimulatedWhatsApp({
  paymentId,
  initialChat,
  paymentStatus,
}: SimulatedWhatsAppProps) {
  const [chat, setChat] = useState<ChatMessage[]>(initialChat);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isClarifying, setIsClarifying] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/${paymentId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.chat) {
          setChat(data.chat);
        }
      } catch (err) {
        console.error("Chat polling error:", err);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [paymentId]);

  async function handleSend(customText?: string) {
    const textToSend = (customText ?? input).trim();
    if (!textToSend || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setChat((prev) => [...prev, data.message]);
        }
        if (!customText) setInput("");
      }
    } catch (err) {
      console.error("Failed to send customer reply:", err);
    } finally {
      setIsSending(false);
    }
  }

  async function handleAskCustomer() {
    if (isClarifying) return;
    setIsClarifying(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/clarify`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sent && data.message) {
          const fetchRes = await fetch(`/api/payments/${paymentId}`);
          const fetchJson = await fetchRes.json();
          if (fetchJson.chat) setChat(fetchJson.chat);
        }
      }
    } catch (err) {
      console.error("Failed to trigger clarification:", err);
    } finally {
      setIsClarifying(false);
    }
  }

  return (
    <div className="bg-white border border-line rounded-lg overflow-hidden shadow-xs">
      {/* Simulation Header */}
      <div className="bg-paper px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green" />
          <span className="text-xs font-mono font-medium text-ink">
            Customer conversation
          </span>
          <span className="text-[11px] font-mono text-muted">
            (This is a practice chat, not a real message)
          </span>
        </div>

        {chat.length === 0 && paymentStatus !== "resolved" && (
          <button
            onClick={handleAskCustomer}
            disabled={isClarifying}
            className="text-xs font-mono px-3 py-1 bg-ink text-white rounded hover:bg-ink/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isClarifying ? "Writing question..." : "Ask the customer →"}
          </button>
        )}
      </div>

      {/* Message Viewport */}
      <div className="p-4 space-y-3 min-h-[140px] max-h-[320px] overflow-y-auto bg-[#FAF9F5]">
        {chat.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted font-body">
            <div className="font-medium text-ink">We haven't asked the customer yet.</div>
            <div className="text-[11px] mt-1 text-muted">
              When we are not sure which order this belongs to, we ask one polite question here.
            </div>
          </div>
        ) : (
          chat.map((msg) => {
            const isSystem = msg.sender === "merchant_system";
            const timeStr = new Date(msg.created_at).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={msg.id}
                className={`flex ${isSystem ? "justify-end" : "justify-start"} animate-fadeIn`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3.5 py-2.5 shadow-2xs ${
                    isSystem
                      ? "bg-[#227A56] text-white rounded-tr-xs"
                      : "bg-white text-ink border border-line rounded-tl-xs"
                  }`}
                >
                  <div className="text-xs font-body leading-relaxed">{msg.message}</div>
                  <div
                    className={`text-[10px] font-mono mt-1 text-right ${
                      isSystem ? "text-white/70" : "text-muted"
                    }`}
                  >
                    {isSystem ? "Your store" : "Customer"} · {timeStr}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Customer Reply Input */}
      <div className="p-3 bg-white border-t border-line">
        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="text-[10px] font-mono text-muted">Try a reply:</span>
          {["haan blue kurta wala", "red one pls", "yoga mat"].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleSend(chip)}
              disabled={isSending}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-paper hover:bg-line border border-line text-ink transition-colors cursor-pointer disabled:opacity-50"
            >
              &quot;{chip}&quot;
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type what the customer might say (e.g. 'the blue kurta')..."
            className="flex-1 text-xs font-body px-3 py-2 bg-paper border border-line rounded focus:outline-none focus:border-ink transition-colors"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="text-xs font-mono font-medium px-4 py-2 bg-ink text-white rounded hover:bg-ink/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSending ? "Sending..." : "Send reply"}
          </button>
        </form>
      </div>
    </div>
  );
}
