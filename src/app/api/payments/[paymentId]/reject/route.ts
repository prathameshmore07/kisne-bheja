import { NextRequest, NextResponse } from "next/server";
import { rejectPayment } from "@/lib/merchantActions";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await props.params;
    const body = await req.json().catch(() => ({}));
    if (!body.order_id) {
      return NextResponse.json({ error: "order_id is required" }, { status: 400 });
    }
    const result = rejectPayment(paymentId, body.order_id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "error" }, { status: 400 });
  }
}
