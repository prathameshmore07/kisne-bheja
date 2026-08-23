import { NextRequest } from "next/server";
import { unlinkPaymentAction } from "@/lib/merchantActions";
import { apiSuccess, handleApiError } from "@/lib/apiResponse";

export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await props.params;
    const result = await unlinkPaymentAction(paymentId);
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
