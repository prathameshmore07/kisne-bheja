import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { processCustomerReply } from "@/lib/reply";
import { getPaymentById } from "@/lib/repo";

function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
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
    const signature = req.headers.get("x-reply-signature") || req.headers.get("x-webhook-signature");
    const secret = process.env.REPLY_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;

    // Strict signature verification
    if (!secret) {
      return NextResponse.json({ error: "Reply webhook secret not configured" }, { status: 500 });
    }

    if (!signature || !verifyWebhookSignature(rawBody, signature, secret)) {
      console.warn("Inbound reply webhook rejected: Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const paymentId = payload.payment_id;
    const message = payload.message || payload.Body || payload.text;

    if (!paymentId || !message) {
      return NextResponse.json({ error: "payment_id and message are required" }, { status: 400 });
    }

    const payment = await getPaymentById(paymentId);
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const result = await processCustomerReply(paymentId, String(message).trim());
    return NextResponse.json({
      status: "processed",
      paymentId,
      interpretation: result.interpretation,
      outcome: result.outcome,
    });
  } catch (err: any) {
    console.error("Error processing inbound reply webhook:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to process reply" }, { status: 500 });
  }
}
