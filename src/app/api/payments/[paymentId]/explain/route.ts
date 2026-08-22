import { NextRequest, NextResponse } from "next/server";
import { getEvidenceForPayment } from "@/lib/repo";
import { explainEvidence } from "@/lib/gemini";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await props.params;
  const body = await req.json().catch(() => ({}));
  const orderId = body.order_id as string | undefined;

  if (!orderId) {
    return NextResponse.json({ error: "order_id is required" }, { status: 400 });
  }

  const signals = getEvidenceForPayment(paymentId)
    .filter((e) => e.candidate_order_id === orderId)
    .map((e) => ({
      signal_type: e.signal_type,
      weight: e.signal_weight,
      detail: e.detail ?? "",
    }));

  if (signals.length === 0) {
    return NextResponse.json({
      explanation: "No evidence recorded yet for this candidate.",
    });
  }

  const result = await explainEvidence(signals);
  return NextResponse.json(result);
}
