import { NextRequest } from "next/server";
import { z } from "zod";
import { rejectPayment } from "@/lib/merchantActions";
import { apiSuccess, handleApiError } from "@/lib/apiResponse";

const RejectSchema = z.object({
  order_id: z.string().min(1, "order_id is required"),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await props.params;
    const rawBody = await req.json().catch(() => ({}));
    const body = RejectSchema.parse(rawBody);
    const result = rejectPayment(paymentId, body.order_id);
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
