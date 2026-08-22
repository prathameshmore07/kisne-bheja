import { NextRequest, NextResponse } from "next/server";
import { getPaymentById } from "@/lib/repo";
import { processCustomerReply } from "@/lib/reply";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await props.params;
    const payment = getPaymentById(paymentId);
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const body = await req.json();
    const message = (body.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const result = await processCustomerReply(paymentId, message);
    return NextResponse.json({ status: "processed", ...result });
  } catch (error: any) {
    console.error("Process customer reply error:", error);
    return NextResponse.json({ error: error?.message ?? "Error" }, { status: 500 });
  }
}