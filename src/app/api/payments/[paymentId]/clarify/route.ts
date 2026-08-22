import { NextRequest, NextResponse } from "next/server";
import { maybeSendClarification } from "@/lib/clarification";

export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await props.params;
    const result = await maybeSendClarification(paymentId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Clarify route error:", error);
    return NextResponse.json({ error: error?.message ?? "Error" }, { status: 500 });
  }
}