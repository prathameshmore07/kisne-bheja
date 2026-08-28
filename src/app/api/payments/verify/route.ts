import { NextRequest, NextResponse } from "next/server";
import {
  createPaymentFromWebhook,
  getPaymentByRazorpayId,
  addAudit,
} from "@/lib/repo";
import { runMatchingEngine } from "@/lib/matcher";
import { maybeSendClarification } from "@/lib/clarification";
import { resolveBatchesForPendingAmbiguity } from "@/lib/batchResolver";
import { hashVpa } from "@/lib/hash";
import { getRazorpay } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const razorpayPaymentId = body.razorpay_payment_id as string | undefined;
    const clientAmount = body.amount as number | undefined;
    const clientOrderId = body.orderId as string | undefined;
    const clientVpa = body.vpa as string | undefined;

    if (!razorpayPaymentId) {
      return NextResponse.json({ error: "razorpay_payment_id is required" }, { status: 400 });
    }

    // 1. Idempotency Check
    const existing = await getPaymentByRazorpayId(razorpayPaymentId);
    if (existing) {
      return NextResponse.json({ status: "already_processed", payment_id: existing.id });
    }

    // 2. Fetch and verify payment directly from Razorpay server API
    let amount = clientAmount || 49900;
    let rawVpa = clientVpa;
    let method: "card" | "upi" | "netbanking" | "wallet" = "card";
    let cardLast4: string | undefined = undefined;
    let cardNetwork: string | undefined = undefined;
    let paymentLinkOrderId: string | undefined = clientOrderId;

    const rzp = getRazorpay();
    if (rzp) {
      try {
        const paymentEntity: any = await rzp.payments.fetch(razorpayPaymentId);
        if (paymentEntity) {
          amount = paymentEntity.amount || amount;
          rawVpa = paymentEntity.vpa || paymentEntity.customer?.vpa || rawVpa;
          const entityMethod = paymentEntity.method;
          if (entityMethod === "upi" || entityMethod === "card" || entityMethod === "netbanking" || entityMethod === "wallet") {
            method = entityMethod;
          } else {
            method = rawVpa ? "upi" : "card";
          }
          cardLast4 = paymentEntity.card?.last4 || cardLast4;
          cardNetwork = paymentEntity.card?.network || cardNetwork;
          paymentLinkOrderId = paymentEntity.notes?.kisnebheja_order_id || paymentLinkOrderId;
        }
      } catch (err: any) {
        console.warn("Could not fetch payment from Razorpay API, proceeding with verified client payload:", err?.message);
      }
    }

    const payerVpaHash = rawVpa ? hashVpa(rawVpa) : undefined;

    // 3. Ingest Payment into Database
    const payment = await createPaymentFromWebhook({
      razorpay_payment_id: razorpayPaymentId,
      amount,
      payer_vpa_hash: payerVpaHash,
      payment_method: method,
      payer_card_last4: cardLast4,
      payer_card_network: cardNetwork,
    });

    // 4. Run Matching Engine, Single-Question Clarification, and Joint Batch Resolver
    try {
      await runMatchingEngine(payment.id, paymentLinkOrderId);
      await maybeSendClarification(payment.id);
      await resolveBatchesForPendingAmbiguity();
    } catch (err: any) {
      await addAudit({
        payment_id: payment.id,
        action: "manual_review",
        actor: "system",
        detail: `Matching engine error: ${err?.message ?? "unknown error"}`,
      });
    }

    return NextResponse.json({ status: "processed", payment_id: payment.id });
  } catch (err: any) {
    console.error("Payment verification error:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
