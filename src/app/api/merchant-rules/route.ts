import { NextRequest } from "next/server";
import { z } from "zod";
import { getMerchantRules, createMerchantRule } from "@/lib/repo";
import { apiSuccess, handleApiError } from "@/lib/apiResponse";

const CreateRuleSchema = z.object({
  rule_name: z.string().min(1, "Rule name is required"),
  condition_type: z.enum(["customer_name", "payer_vpa_hash", "product_name", "min_amount"]),
  condition_value: z.string().min(1, "Condition value is required"),
  signal_weight: z.number().min(-1).max(1),
  detail: z.string().optional(),
});

export async function GET() {
  try {
    const rules = await getMerchantRules();
    return apiSuccess({ rules });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const body = CreateRuleSchema.parse(rawBody);

    const rule = await createMerchantRule({
      rule_name: body.rule_name,
      condition_type: body.condition_type,
      condition_value: body.condition_value,
      signal_weight: body.signal_weight,
      detail: body.detail,
    });

    return apiSuccess({ rule });
  } catch (err) {
    return handleApiError(err);
  }
}
