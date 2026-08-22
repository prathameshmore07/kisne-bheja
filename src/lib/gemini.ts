import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

export const ClarificationSchema = z.object({
  message: z.string().min(1),
});

export const InterpretationSchema = z.object({
  matched_order_hint: z.string().nullable(),
  confidence_signal: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const SummarySchema = z.object({
  summary: z.string(),
});

export function extractJson(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith("xxxxxxxx") || apiKey.trim() === "") {
    return null;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  return genAI.getGenerativeModel({ model: modelName });
}

export async function generateClarificationMessage(
  candidates: Array<{ order_id: string; product_name: string; amount?: number }>
): Promise<{ message: string }> {
  const candidateNames = candidates.map((c) => c.product_name);

  const fallbackMessage =
    candidateNames.length > 0
      ? `Hi! Just confirming — is this payment for the ${candidateNames.join(" or the ")}?`
      : "Hi! We received your payment. Could you please confirm your order details?";

  try {
    const model = getModel();
    if (!model) {
      return { message: fallbackMessage };
    }

    const prompt = `You are an AI assistant for a merchant. A customer sent a payment that could match multiple pending orders: ${JSON.stringify(
      candidates
    )}.
Draft a polite, concise, single-sentence WhatsApp clarification message asking the customer to confirm which item they purchased.
Keep it natural, friendly, and under 25 words.

Respond ONLY with valid JSON matching this schema:
{
  "message": "the drafted message"
}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const parsed = extractJson(raw);
    return ClarificationSchema.parse(parsed);
  } catch (err) {
    console.warn("Gemini clarification error (using fallback):", err);
    return { message: fallbackMessage };
  }
}

export async function interpretCustomerReply(
  customerMessage: string,
  candidates: Array<{ order_id: string; product_name: string }>
): Promise<{
  matched_order_hint: string | null;
  confidence_signal: number;
  reasoning: string;
}> {
  function runFallback(): {
    matched_order_hint: string | null;
    confidence_signal: number;
    reasoning: string;
  } {
    const lower = customerMessage.toLowerCase().trim();
    for (const c of candidates) {
      const prodLower = c.product_name.toLowerCase();
      const words = prodLower.split(/\s+/).filter((w) => w.length > 2);
      if (lower.includes(prodLower) || words.some((w) => lower.includes(w))) {
        return {
          matched_order_hint: c.order_id,
          confidence_signal: 0.85,
          reasoning: `Fallback keyword match (Gemini unavailable) on "${c.product_name}"`,
        };
      }
    }

    return {
      matched_order_hint: null,
      confidence_signal: 0,
      reasoning: "Fallback keyword match (Gemini unavailable) found no match",
    };
  }

  try {
    const model = getModel();
    if (!model) {
      return runFallback();
    }

    const prompt = `You are an evidence interpretation engine. A customer was asked to clarify which order their payment belongs to.
Pending candidate orders: ${JSON.stringify(candidates)}.
Customer reply message: "${customerMessage}".

Analyze the customer reply (note: reply might be in English, Hindi, or Hinglish like "haan blue kurta wala", "red one pls", "nahi yoga mat ke liye", etc.).
Determine which candidate order (by order_id) the customer intended, or null if ambiguous/unrelated.
Assign a confidence signal from 0.0 to 1.0 (typically 0.8 to 0.95 for unambiguous clear mentions, 0.5-0.7 for partial mentions, 0.0 for unrelated).

Respond ONLY with valid JSON matching this schema:
{
  "matched_order_hint": "order_id" or null,
  "confidence_signal": 0.85,
  "reasoning": "brief explanation"
}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const parsed = extractJson(raw);
    return InterpretationSchema.parse(parsed);
  } catch (err) {
    console.warn("Gemini interpretation error (using fallback):", err);
    return runFallback();
  }
}

export async function summarizeEvidenceForMerchant(
  productName: string,
  confidence: number,
  signals: string[]
): Promise<string> {
  const fallback = `Matched "${productName}" with ${Math.round(confidence * 100)}% confidence based on ${signals.join(", ")}.`;
  try {
    const model = getModel();
    if (!model) return fallback;
    const prompt = `Summarize this payment resolution in one clear sentence for a merchant dashboard.
Candidate order: ${productName}
Confidence: ${(confidence * 100).toFixed(0)}%
Observed signals: ${signals.join("; ")}

Respond ONLY with valid JSON:
{
  "summary": "one sentence explanation"
}`;
    const result = await model.generateContent(prompt);
    const parsed = extractJson(result.response.text());
    return SummarySchema.parse(parsed).summary;
  } catch {
    return fallback;
  }
}