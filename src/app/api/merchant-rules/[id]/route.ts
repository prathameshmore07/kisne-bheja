import { NextRequest } from "next/server";
import { z } from "zod";
import { deleteMerchantRule, toggleMerchantRule } from "@/lib/repo";
import { apiSuccess, handleApiError } from "@/lib/apiResponse";

const ToggleRuleSchema = z.object({
  is_active: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const rawBody = await req.json().catch(() => ({}));
    const body = ToggleRuleSchema.parse(rawBody);

    await toggleMerchantRule(params.id, body.is_active);
    return apiSuccess({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    await deleteMerchantRule(params.id);
    return apiSuccess({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
