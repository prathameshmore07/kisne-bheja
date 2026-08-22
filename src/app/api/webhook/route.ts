import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createPaymentFromWebhook } from "@/lib/repo";
import { runMatchingEngine } from "@/lib/matcher";
import { hashVpa } from "@/lib/hash";

function verifySignature(body: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Strict HMAC verification when secret is configured
    if (secret && secret !== "xxxxxxxxxxxxxxxxxxxx") {
      if (!signature || !verifySignature(rawBody, signature, secret)) {
        console.warn("Invalid Razorpay webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (event === "payment.captured" || event === "payment_link.paid") {
      const paymentEntity =
        payload.payload?.payment?.entity ?? payload.payload?.payment_link?.entity;

      if (!paymentEntity) {
        return NextResponse.json({ error: "No payment entity found in payload" }, { status: 400 });
      }

      const razorpay_payment_id = paymentEntity.id ?? "pay_unknown";
      const amount = paymentEntity.amount; // paise
      const rawVpa = paymentEntity.vpa ?? paymentEntity.customer?.vpa;
      const payer_vpa_hash = rawVpa ? hashVpa(rawVpa) : undefined;
      const razorpay_payment_link_id =
        paymentEntity.payment_link_id ?? payload.payload?.payment_link?.entity?.id ?? undefined;

      if (!amount) {
        return NextResponse.json({ error: "Invalid payment amount in payload" }, { status: 400 });
      }

      // 1. Ingest payment with webhook_received audit
      const payment = createPaymentFromWebhook({
        razorpay_payment_id,
        amount,
        payer_vpa_hash,
        razorpay_payment_link_id,
      });

      // 2. Run deterministic candidate matching engine
      const matchResult = runMatchingEngine(payment.id);

      return NextResponse.json({
        status: "ok",
        paymentId: payment.id,
        action: matchResult.action,
        confidence: matchResult.best?.confidence ?? 0,
      });
    }

    return NextResponse.json({ status: "ignored", event });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: error?.message ?? "Webhook error" }, { status: 500 });
  }
}
