import { NextRequest } from "next/server";
import { maybeSendClarification } from "@/lib/clarification";
import { apiSuccess, handleApiError } from "@/lib/apiResponse";

export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await props.params;
    const result = await maybeSendClarification(paymentId);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}