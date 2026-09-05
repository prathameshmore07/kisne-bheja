import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

export const MerchantFramingSchema = z.object({
  distinguishing_question: z.string().min(1),
  recent_pattern_insight: z.string().nullable().optional(),
  distinguishing_factors: z.array(z.string()).default([]),
});

export type MerchantFraming = z.infer<typeof MerchantFramingSchema>;

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

export interface CandidateInfo {
  order_id: string;
  product_name: string;
  amount?: number;
  customer_name?: string | null;
  created_at?: number;
}

export interface RecentPaymentInfo {
  id: string;
  amount: number;
  product_name?: string | null;
  customer_name?: string | null;
  resolved_at?: number | null;
}

export async function generateMerchantClarificationFraming(input: {
  payment: {
    id: string;
    amount: number;
    received_at: number;
    payment_method?: string;
  };
  candidates: CandidateInfo[];
  recentResolvedPayments?: RecentPaymentInfo[];
}): Promise<MerchantFraming> {
  const amountFormatted = `₹${(input.payment.amount / 100).toFixed(2)}`;
  const candidateNames = input.candidates
    .map((c) => (c.customer_name ? `${c.customer_name} (${c.product_name})` : c.product_name))
    .join(" vs ");

  // Deterministic fallback generator
  function makeFallback(reason: string): MerchantFraming {
    let recentPattern: string | null = null;
    if (input.recentResolvedPayments && input.recentResolvedPayments.length > 0) {
      const recentSameAmount = input.recentResolvedPayments.find(
        (p) => p.amount === input.payment.amount && p.customer_name
      );
      if (recentSameAmount) {
        const minsAgo = recentSameAmount.resolved_at
          ? Math.max(1, Math.round((Date.now() - recentSameAmount.resolved_at) / 60000))
          : 5;
        recentPattern = `A similar payment of ${amountFormatted} just resolved to ${recentSameAmount.customer_name} ${minsAgo} minutes ago. Check if this is a repeat payment or intended for another customer.`;
      }
    }

    const distinguishingQuestion =
      input.candidates.length > 0
        ? `Two pending orders share the amount of ${amountFormatted}: ${candidateNames}. Confirm which customer this payment belongs to.`
        : `Unassigned payment of ${amountFormatted} received. Confirm order allocation.`;

    const factors = input.candidates.map((c) => {
      const ageMins = c.created_at ? Math.round((Date.now() - c.created_at) / 60000) : 0;
      return `${c.customer_name || "Customer"} · ${c.product_name} (placed ${ageMins}m ago)`;
    });

    console.log(`[Gemini Merchant Framing] (${reason}) -> Using deterministic framing`);
    return {
      distinguishing_question: distinguishingQuestion,
      recent_pattern_insight: recentPattern,
      distinguishing_factors: factors,
    };
  }

  try {
    const model = getModel();
    if (!model) {
      return makeFallback("Gemini API key not configured");
    }

    const prompt = `You are an AI Finance Controller for an Indian e-commerce store.
An incoming payment arrived via ${input.payment.payment_method || "card/bank transfer"} without an order reference:
Payment: Amount ${amountFormatted}, received at ${new Date(input.payment.received_at).toLocaleTimeString("en-IN")}.

Pending Candidate Orders with this exact amount:
${JSON.stringify(input.candidates, null, 2)}

Recently resolved payments in the past hour:
${JSON.stringify(input.recentResolvedPayments || [], null, 2)}

Task:
Generate one concise, professional framing question for the merchant inside their dashboard to help them distinguish between these candidates with a single tap.
If recent payment history shows a similar payment resolved to one of these customers in the last few minutes, explicitly surface that pattern (e.g., "A similar payment just resolved to [Customer] minutes ago — could this be a repeat order?").

Respond ONLY with valid JSON matching this schema:
{
  "distinguishing_question": "One clear sentence under 35 words asking the merchant which order should be confirmed",
  "recent_pattern_insight": "A brief sentence pointing out recent matching payments, or null if no relevant pattern exists",
  "distinguishing_factors": ["Point 1 about timing or customer", "Point 2 about product"]
}`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API call timed out after 5s")), 5000)
    );
    const result: any = await Promise.race([model.generateContent(prompt), timeoutPromise]);
    const parsed = extractJson(result.response.text());
    const validated = MerchantFramingSchema.parse(parsed);
    console.log(`[Gemini Merchant Framing SUCCESS] -> "${validated.distinguishing_question}"`);
    return validated;
  } catch (err: any) {
    const msg = err?.message?.split("\n")[0] || String(err);
    return makeFallback(`Gemini API notice: ${msg}`);
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
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API call timed out after 5s")), 5000)
    );
    const result: any = await Promise.race([model.generateContent(prompt), timeoutPromise]);
    const parsed = extractJson(result.response.text());
    const validated = SummarySchema.parse(parsed);
    return validated.summary;
  } catch {
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

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API call timed out after 5s")), 5000)
    );
    const result: any = await Promise.race([model.generateContent(prompt), timeoutPromise]);
    const parsed = extractJson(result.response.text());
    const explanation = parsed.explanation ?? fallback;
    return { explanation };
  } catch {
    return { explanation: fallback };
  }
}