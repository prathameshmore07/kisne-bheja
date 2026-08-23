import { NextRequest } from "next/server";
import { z } from "zod";
import { getPaymentById } from "@/lib/repo";
import { processCustomerReply } from "@/lib/reply";
import { apiSuccess, apiError, handleApiError } from "@/lib/apiResponse";

const ReplySchema = z.object({
  message: z.string().min(1, "message is required"),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await props.params;
    const payment = getPaymentById(paymentId);
    if (!payment) {
      return apiError("Payment not found", 404);
    }

    const rawBody = await req.json().catch(() => ({}));
    const body = ReplySchema.parse(rawBody);

    const result = await processCustomerReply(paymentId, body.message.trim());
    return apiSuccess({ status: "processed", ...result });
  } catch (error) {
    return handleApiError(error);
  }
}