import { NextRequest, NextResponse } from "next/server";
import {
  getPaymentById,
  getOrderById,
  getChatForPayment,
  getBatchResolutionInfoForPayment,
} from "@/lib/repo";
import { getAllCandidateScores } from "@/lib/scorer";
import { getTimelineForPayment } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await props.params;
    const payment = await getPaymentById(paymentId);

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const resolvedOrder = payment.resolved_order_id
      ? await getOrderById(payment.resolved_order_id)
      : null;

    const candidateScores = await getAllCandidateScores(paymentId);
    const timeline = await getTimelineForPayment(paymentId);
    const chat = await getChatForPayment(paymentId);
    const batchResolution = await getBatchResolutionInfoForPayment(paymentId);

    const candidates = candidateScores.map((c) => ({
      order_id: c.candidate_order_id,
      product_name: c.order?.product_name ?? "Unknown order",
      amount: c.order?.amount ?? 0,
      customer_name: c.order?.customer_name ?? null,
      customer_vpa_hash: c.order?.customer_vpa_hash ?? null,
      confidence: c.confidence,
      evidence: c.evidence,
    }));

    return NextResponse.json({
      payment: {
        id: payment.id,
        status: payment.status,
        confidence: payment.confidence,
        amount: payment.amount,
        resolved_order_id: payment.resolved_order_id,
        received_at: payment.received_at,
        resolved_at: payment.resolved_at,
      },
      resolvedOrder,
      candidates,
      timeline,
      chat,
      batchResolution,
    });
  } catch (error) {
    console.error("Error fetching payment data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
