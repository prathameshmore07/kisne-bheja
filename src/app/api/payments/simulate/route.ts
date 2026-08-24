import { NextRequest } from "next/server";
import { z } from "zod";
import { createSimulatedPayment, addAudit, getPaymentById } from "@/lib/repo";
import { runMatchingEngine } from "@/lib/matcher";
import { maybeSendClarification } from "@/lib/clarification";
import { resolveBatchesForPendingAmbiguity } from "@/lib/batchResolver";
import { hashVpa } from "@/lib/hash";
import { apiSuccess, handleApiError } from "@/lib/apiResponse";

const SimulatePaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"), // in paise
  payer_vpa: z.string().optional(),
  payment_method: z.enum(["upi", "card", "netbanking", "wallet"]).optional(),
  payer_card_last4: z.string().optional(),
  payer_card_network: z.string().optional(),
  payment_link_order_id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const body = SimulatePaymentSchema.parse(rawBody);

    const payerVpaHash = body.payer_vpa ? hashVpa(body.payer_vpa) : undefined;

    // 1. Ingest simulated payment into database
    const payment = await createSimulatedPayment({
      amount: Math.round(body.amount),
      payer_vpa_hash: payerVpaHash,
      payment_method: body.payment_method || (body.payer_card_last4 ? "card" : "upi"),
      payer_card_last4: body.payer_card_last4,
      payer_card_network: body.payer_card_network,
    });

    // 2. Converge on the exact same downstream pipeline as real webhook
    try {
      await runMatchingEngine(payment.id, body.payment_link_order_id);
      await maybeSendClarification(payment.id);
      await resolveBatchesForPendingAmbiguity();
    } catch (err: any) {
      await addAudit({
        payment_id: payment.id,
        action: "manual_review",
        actor: "system",
        detail: `Matching engine error — sent to manual review: ${err?.message ?? "unknown error"}`,
      });
    }

    // 3. Fetch latest state of processed payment
    const latestPayment = await getPaymentById(payment.id);

    return apiSuccess({
      payment: latestPayment || payment,
      message: "Payment successfully ingested and processed through matching pipeline",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
