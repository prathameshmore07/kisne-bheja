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
  candidates: Array<{ order_id: string; product_name: string; amount?: number }>,
  language: "hinglish" | "english" | "hindi" = "hinglish"
): Promise<{ message: string }> {
  const candidateNames = candidates.map((c) => c.product_name);

  let fallbackMessage = "Hi! We received your payment. Could you please confirm your order details?";
  if (language === "hindi") {
    fallbackMessage =
      candidateNames.length > 0
        ? `नमस्ते! क्या आपका भुगतान ${candidateNames.join(" या ")} के लिए था?`
        : "नमस्ते! क्या आप अपने ऑर्डर की पुष्टि कर सकते हैं?";
  } else if (language === "english") {
    fallbackMessage =
      candidateNames.length > 0
        ? `Hi! Just confirming — is this payment for the ${candidateNames.join(" or the ")}?`
        : "Hi! We received your payment. Could you please confirm your order details?";
  } else {
    fallbackMessage =
      candidateNames.length > 0
        ? `Hi! Just checking, was your payment for the ${candidateNames.join(" or the ")}?`
        : "Hi! We received your payment. Could you please confirm your order details?";
  }

  try {
    const model = getModel();
    if (!model) {
      console.log(`[Gemini Clarification] (API key not configured) -> Using template: "${fallbackMessage}"`);
      return { message: fallbackMessage };
    }

    const langInstruction =
      language === "hindi"
        ? "Draft the message in polite, natural conversational Hindi (Devanagari script)."
        : language === "english"
        ? "Draft the message in polite, professional English."
        : "Draft the message in natural, conversational Hinglish (Hindi phrasing written in Latin script).";

    const prompt = `You are an AI assistant for an Indian merchant store. A customer sent a payment that could match multiple pending orders: ${JSON.stringify(
      candidates
    )}.
${langInstruction}
Draft a concise, single-sentence clarification message asking the customer to confirm which item they purchased.
Keep it natural, friendly, and under 25 words.

Respond ONLY with valid JSON matching this schema:
{
  "message": "the drafted message"
}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const parsed = extractJson(raw);
    const validated = ClarificationSchema.parse(parsed);
    console.log(`[Gemini Clarification SUCCESS] Drafted: "${validated.message}"`);
    return validated;
  } catch (err: any) {
    const msg = err?.message?.split("\n")[0] || String(err);
    console.log(`[Gemini Clarification FAILED: ${msg}] -> Using fallback template: "${fallbackMessage}"`);
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
  function runFallback(reason: string): {
    matched_order_hint: string | null;
    confidence_signal: number;
    reasoning: string;
  } {
    const lower = customerMessage.toLowerCase().trim();

    if (candidates.length === 0) {
      const res = {
        matched_order_hint: null,
        confidence_signal: 0,
        reasoning: "Fallback matching failed: no candidate orders provided",
      };
      console.log(`[Deterministic Fallback] (${reason}) -> No candidate orders available`);
      return res;
    }

    // 1. Exact full name or direct substring match
    for (const c of candidates) {
      const prodLower = c.product_name.toLowerCase();
      if (lower.includes(prodLower) || prodLower.includes(lower)) {
        const res = {
          matched_order_hint: c.order_id,
          confidence_signal: 0.90,
          reasoning: `Deterministic fallback exact keyword match on "${c.product_name}"`,
        };
        console.log(`[Deterministic Fallback Matched Exact] (${reason}) -> Matched "${c.product_name}" (${c.order_id}) with 90% confidence`);
        return res;
      }
    }

    // 2. Color synonyms in Hindi / Hinglish
    const colorSynonyms: Record<string, string[]> = {
      blue: ["blue", "neela", "nila"],
      red: ["red", "laal", "lal"],
      green: ["green", "hara", "hari"],
      black: ["black", "kaala", "kala"],
    };

    for (const c of candidates) {
      const prodLower = c.product_name.toLowerCase();
      for (const [enColor, synonyms] of Object.entries(colorSynonyms)) {
        if (prodLower.includes(enColor)) {
          if (synonyms.some((syn) => lower.includes(syn))) {
            const res = {
              matched_order_hint: c.order_id,
              confidence_signal: 0.85,
              reasoning: `Deterministic fallback color synonym match (${enColor}) on "${c.product_name}"`,
            };
            console.log(`[Deterministic Fallback Matched Synonym] (${reason}) -> Matched synonym "${enColor}" for "${c.product_name}" (${c.order_id}) with 85% confidence`);
            return res;
          }
        }
      }
    }

    // 3. Best token overlap
    let bestCandidate: (typeof candidates)[0] | null = null;
    let maxMatches = 0;

    for (const c of candidates) {
      const prodLower = c.product_name.toLowerCase();
      const words = prodLower.split(/\s+/).filter((w) => w.length > 2);
      const matches = words.filter((w) => lower.includes(w)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestCandidate = c;
      }
    }

    if (bestCandidate && maxMatches > 0) {
      const res = {
        matched_order_hint: bestCandidate.order_id,
        confidence_signal: 0.85,
        reasoning: `Deterministic fallback keyword overlap match on "${bestCandidate.product_name}"`,
      };
      console.log(`[Deterministic Fallback Matched Keyword] (${reason}) -> Matched keyword overlap for "${bestCandidate.product_name}" (${bestCandidate.order_id}) with 85% confidence`);
      return res;
    }

    const res = {
      matched_order_hint: null,
      confidence_signal: 0,
      reasoning: "Deterministic fallback found no matching product keywords in customer reply",
    };
    console.log(`[Deterministic Fallback No Match] (${reason}) -> No keyword match for reply "${customerMessage}"`);
    return res;
  }

  try {
    const model = getModel();
    if (!model) {
      return runFallback("Gemini API key not configured or empty");
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
    const validated = InterpretationSchema.parse(parsed);

    console.log(
      `[Gemini Call SUCCESS] Interpreted reply "${customerMessage}" -> hint: ${
        validated.matched_order_hint ?? "none"
      } (${Math.round(validated.confidence_signal * 100)}%). ${validated.reasoning}`
    );
    return validated;
  } catch (err: any) {
    const msg = err?.message?.split("\n")[0] || String(err);
    console.log(`[Gemini Call FAILED: ${msg}] -> Falling back to deterministic keyword matcher.`);
    return runFallback(`Gemini API notice: ${msg}`);
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
    if (!model) {
      console.log(`[Gemini Summary] (No API key) -> Fallback summary: "${fallback}"`);
      return fallback;
    }
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
    const validated = SummarySchema.parse(parsed);
    console.log(`[Gemini Summary SUCCESS] -> "${validated.summary}"`);
    return validated.summary;
  } catch (err: any) {
    const msg = err?.message?.split("\n")[0] || String(err);
    console.log(`[Gemini Summary FAILED: ${msg}] -> Fallback summary: "${fallback}"`);
    return fallback;
  }
}

export async function explainEvidence(
  signals: Array<{ signal_type: string; weight: number; detail: string }>
): Promise<{ explanation: string }> {
  const signalSummary = signals
    .map((s) => `${s.signal_type} (${s.weight >= 0 ? "+" : ""}${Math.round(s.weight * 100)}%): ${s.detail}`)
    .join(", ");

  const fallback = signals.length > 0
    ? `Confidence driven by ${signalSummary}.`
    : "No evidence recorded yet for this candidate.";

  try {
    const model = getModel();
    if (!model) {
      console.log(`[Gemini Explain] (No API key) -> Fallback explanation: "${fallback}"`);
      return { explanation: fallback };
    }

    const prompt = `You are an evidence explanation engine for a fintech reconciliation ledger.
Explain why this candidate order has its current score based on the following recorded evidence signals:
${JSON.stringify(signals)}

Write a single, concise, professional sentence (max 25 words) explaining the primary reason for this candidate's score.
Respond ONLY with valid JSON:
{
  "explanation": "one sentence explanation"
}`;

    const result = await model.generateContent(prompt);
    const parsed = extractJson(result.response.text());
    const explanation = parsed.explanation ?? fallback;
    console.log(`[Gemini Explain SUCCESS] -> "${explanation}"`);
    return { explanation };
  } catch (err: any) {
    const msg = err?.message?.split("\n")[0] || String(err);
    console.log(`[Gemini Explain FAILED: ${msg}] -> Fallback explanation: "${fallback}"`);
    return { explanation: fallback };
  }
}