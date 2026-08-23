import { NextRequest } from "next/server";
import { z } from "zod";
import { getEvidenceForPayment } from "@/lib/repo";
import { explainEvidence } from "@/lib/gemini";
import { apiSuccess, handleApiError } from "@/lib/apiResponse";

const ExplainSchema = z.object({
  order_id: z.string().min(1, "order_id is required"),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await props.params;
    const rawBody = await req.json().catch(() => ({}));
    const body = ExplainSchema.parse(rawBody);

    const allEvidence = await getEvidenceForPayment(paymentId);
    const signals = allEvidence
      .filter((e) => e.candidate_order_id === body.order_id)
      .map((e) => ({
        signal_type: e.signal_type,
        weight: e.signal_weight,
        detail: e.detail ?? "",
      }));

    if (signals.length === 0) {
      return apiSuccess({
        explanation: "No evidence recorded yet for this candidate.",
      });
    }

    const result = await explainEvidence(signals);
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
