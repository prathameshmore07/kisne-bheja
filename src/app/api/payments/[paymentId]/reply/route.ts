import { NextRequest, NextResponse } from "next/server";
import { addChatMessage, getPaymentById } from "@/lib/repo";

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

    const chatMessage = addChatMessage(paymentId, "customer", message);
    return NextResponse.json({ status: "stored", message: chatMessage });
  } catch (error: any) {
    console.error("Reply route error:", error);
    return NextResponse.json({ error: error?.message ?? "Error" }, { status: 500 });
  }
}