import { NextRequest, NextResponse } from "next/server";
import { createPaymentLink } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amount = body.amount;
    const description = body.description ?? "Kisne Bheja test payment";
    const orderId = body.orderId as string | undefined;

    if (!amount || typeof amount !== "number") {
      return NextResponse.json({ error: "amount (in paise) is required" }, { status: 400 });
    }

    const link = await createPaymentLink({ amount, description, orderId });
    return NextResponse.json(link);
  } catch (err: any) {
    console.error("Razorpay payment link creation error:", err);
    return NextResponse.json({ error: err?.message ?? "Razorpay error" }, { status: 500 });
  }
}
