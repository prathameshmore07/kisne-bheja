import { NextRequest } from "next/server";
import { z } from "zod";
import { approvePayment } from "@/lib/merchantActions";
import { apiSuccess, handleApiError } from "@/lib/apiResponse";

const ApproveSchema = z.object({ order_id: z.string().optional() });

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await props.params;
    const rawBody = await req.json().catch(() => ({}));
    const body = ApproveSchema.parse(rawBody);
    const result = await approvePayment(paymentId, body.order_id);
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
