import { NextRequest, NextResponse } from "next/server";
import { unlinkPaymentAction } from "@/lib/merchantActions";

export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await props.params;
    const result = unlinkPaymentAction(paymentId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "error" }, { status: 400 });
  }
}
