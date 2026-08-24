"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatMessage, PaymentStatus } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

interface SimulatedWhatsAppProps {
  paymentId: string;
  initialChat: ChatMessage[];
  paymentStatus: PaymentStatus;
}

type Role = "customer" | "merchant";

export default function SimulatedWhatsApp({
  paymentId,
  initialChat,
  paymentStatus,
}: SimulatedWhatsAppProps) {
  const [chat, setChat] = useState<ChatMessage[]>(initialChat);
  const [input, setInput] = useState("");
  const [role, setRole] = useState<Role>("customer");
  const [isSending, setIsSending] = useState(false);
  const [isClarifying, setIsClarifying] = useState(false);
  const [language, setLanguage] = useState<"hinglish" | "english" | "hindi">("hinglish");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kisne-bheja-merchant-settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.clarificationLanguage) {
          setLanguage(parsed.clarificationLanguage);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchChat = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments/${paymentId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.chat) {
        setChat(data.chat);
      }
    } catch (err) {
      console.error("Chat fetch error:", err);
    }
  }, [paymentId]);

  // Listen to custom window events for instant sync across components
  useEffect(() => {
    const handleSync = (e: any) => {
      if (!e.detail || e.detail.paymentId === paymentId) {
        fetchChat();
      }
    };
    window.addEventListener("payment-updated", handleSync);
    return () => {
      window.removeEventListener("payment-updated", handleSync);
    };
  }, [paymentId, fetchChat]);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let channel: any = null;
    let interval: any = null;

    if (supabase) {
      channel = supabase
        .channel(`chat-live-${paymentId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "simulated_chat",
            filter: `payment_id=eq.${paymentId}`,
          },
          () => {
            fetchChat();
          }
        )
        .subscribe();
    } else {
      interval = setInterval(fetchChat, 2000);
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [paymentId, fetchChat]);

  async function handleSend(customText?: string, overrideRole?: Role) {
    const textToSend = (customText ?? input).trim();
    if (!textToSend || isSending) return;

    const currentRole = overrideRole ?? role;
    setIsSending(true);
    try {
      if (currentRole === "merchant") {
        const res = await fetch(`/api/payments/${paymentId}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: textToSend,
            sender: "merchant_system",
          }),
        });
        if (res.ok) {
          if (!customText) setInput("");
          await fetchChat();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("payment-updated", { detail: { paymentId } }));
          }
        }
      } else {
        // If customer replies but no store question was sent yet, auto-clarify first so conversation makes sense
        if (chat.length === 0) {
          await fetch(`/api/payments/${paymentId}/clarify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language }),
          });
        }

        const res = await fetch(`/api/payments/${paymentId}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: textToSend,
            sender: "customer",
          }),
        });
        if (res.ok) {
          if (!customText) setInput("");
          await fetchChat();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("payment-updated", { detail: { paymentId } }));
          }
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
      if (res.ok) {
        await fetchChat();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("payment-updated", { detail: { paymentId } }));
        }
      }
    } catch (err) {
      console.error("Failed to trigger clarification:", err);
    } finally {
      setIsClarifying(false);
    }
  }

  return (
    <div className="bg-white border border-line rounded-lg overflow-hidden font-body">
      {/* Header */}
      <div className="bg-paper px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green" />
          <span className="text-xs font-mono font-medium text-ink">
            WhatsApp Customer Channel
          </span>
          <span className="text-[11px] font-mono text-muted">
            Live messaging and reply interpretation
          </span>
        </div>

        {paymentStatus !== "resolved" && (
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="text-[11px] font-mono px-2 py-1 bg-white border border-line rounded text-ink cursor-pointer focus:outline-none"
              title="Select AI question language"
            >
              <option value="hinglish">Hinglish</option>
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
            </select>

            <button
              onClick={handleAskCustomer}
              disabled={isClarifying}
              className="text-xs font-mono px-3 py-1 bg-ink text-white rounded hover:bg-ink/90 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isClarifying ? "Writing question..." : "Ask Customer →"}
            </button>
          </div>
        )}
      </div>

      {/* Message Viewport */}
      <div className="p-4 space-y-3 min-h-[140px] max-h-[320px] overflow-y-auto bg-[#FAF9F5]">
        {chat.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted font-body">
            <div className="font-medium text-ink">No messages sent yet.</div>
            <div className="text-[11px] mt-1 text-muted">
              Click &quot;Ask Customer&quot; above to dispatch a clarification question.
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
                  className={`max-w-[80%] rounded-lg px-3.5 py-2.5 ${
                    isSystem
                      ? "bg-[#227A56] text-white rounded-tr-xs shadow-xs"
                      : "bg-white text-ink border border-line rounded-tl-xs shadow-xs"
                  }`}
                >
                  <div className="text-xs font-body leading-relaxed">{msg.message}</div>
                  <div
                    className={`text-[10px] font-mono mt-1 text-right flex items-center justify-end gap-1 ${
                      isSystem ? "text-white/75" : "text-muted"
                    }`}
                  >
                    <span>{isSystem ? "Your store" : "Customer"}</span>
                    <span>·</span>
                    <span>{timeStr}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Control Panel */}
      <div className="p-3 bg-white border-t border-line space-y-2.5">
        {/* Channel Persona Switcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-paper p-1 rounded border border-line text-xs font-mono">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                role === "customer"
                  ? "bg-ink text-white font-semibold shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Customer Reply</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("merchant")}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                role === "merchant"
                  ? "bg-[#227A56] text-white font-semibold shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Store Message</span>
            </button>
          </div>

          <span className="text-[10px] font-mono text-muted">
            {role === "customer" ? "Inbound replies update confidence score" : "Outbound message to customer"}
          </span>
        </div>

        {/* Shortcuts */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono text-muted">
            {role === "customer" ? "Customer templates:" : "Store templates:"}
          </span>
          {role === "customer"
            ? ["haan blue kurta wala", "red one pls", "yoga mat"].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSend(chip, "customer")}
                  disabled={isSending}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-paper hover:bg-line border border-line text-ink transition-colors cursor-pointer disabled:opacity-50"
                >
                  &quot;{chip}&quot;
                </button>
              ))
            : [
                "Hi! Was your ₹499 payment for Blue Kurta or Red Kurta?",
                "Could you please share your order name?",
                "Thank you for confirming, order will be dispatched!",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSend(chip, "merchant")}
                  disabled={isSending}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-green/10 hover:bg-green/20 border border-green/20 text-green-950 transition-colors cursor-pointer disabled:opacity-50 truncate max-w-[260px]"
                >
                  &quot;{chip}&quot;
                </button>
              ))}
        </div>

        {/* Message Input Box */}
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
            placeholder={
              role === "customer"
                ? "Type customer reply (e.g. 'the blue kurta')..."
                : "Type message from store to customer..."
            }
            className="flex-1 text-xs font-body px-3 py-2 bg-paper border border-line rounded focus:outline-none focus:border-ink transition-colors"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className={`text-xs font-mono font-medium px-4 py-2 rounded transition-colors disabled:opacity-50 cursor-pointer shadow-xs ${
              role === "customer"
                ? "bg-ink text-white hover:bg-ink/90"
                : "bg-[#227A56] text-white hover:bg-[#1c6446]"
            }`}
          >
            {isSending ? "Sending..." : role === "customer" ? "Send Reply" : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
}
