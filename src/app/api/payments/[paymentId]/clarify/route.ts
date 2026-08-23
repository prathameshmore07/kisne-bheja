import { NextRequest } from "next/server";
import { maybeSendClarification } from "@/lib/clarification";
import { apiSuccess, handleApiError } from "@/lib/apiResponse";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await props.params;
    const body = await req.json().catch(() => ({}));
    const language = body?.language as "hinglish" | "english" | "hindi" | undefined;
    const result = await maybeSendClarification(paymentId, { force: true, language });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
