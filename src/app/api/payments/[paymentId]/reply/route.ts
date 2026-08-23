import { NextRequest } from "next/server";
import { z } from "zod";
import { getPaymentById, addChatMessage, addAudit } from "@/lib/repo";
import { processCustomerReply } from "@/lib/reply";
import { apiSuccess, apiError, handleApiError } from "@/lib/apiResponse";

const ReplySchema = z.object({
  message: z.string().min(1, "message is required"),
  sender: z.enum(["customer", "merchant_system", "merchant"]).optional().default("customer"),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await props.params;
    const payment = await getPaymentById(paymentId);
    if (!payment) {
      return apiError("Payment not found", 404);
    }

    const rawBody = await req.json().catch(() => ({}));
    const body = ReplySchema.parse(rawBody);

    if (body.sender === "merchant_system" || body.sender === "merchant") {
      await addChatMessage(paymentId, "merchant_system", body.message.trim());
      await addAudit({
        payment_id: paymentId,
        action: "clarification_sent",
        actor: "merchant",
        detail: `Merchant sent custom message: "${body.message.trim()}"`,
      });
      return apiSuccess({ status: "sent", sender: "merchant_system", message: body.message.trim() });
    }

    const result = await processCustomerReply(paymentId, body.message.trim());
    return apiSuccess({ status: "processed", ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
