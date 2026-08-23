import { NextRequest } from "next/server";
import { z } from "zod";
import { createOrder, getPendingOrdersByAmount, getPendingOrders, getCancelledOrders } from "@/lib/repo";
import { hashVpa } from "@/lib/hash";
import { apiSuccess, handleApiError } from "@/lib/apiResponse";

const CreateOrderSchema = z.object({
  product_name: z.string().min(1, "Product name is required"),
  amount: z.number().int().positive("Amount must be a positive integer in paise"),
  customer_name: z.string().optional(),
  customer_vpa: z.string().optional(),
  customer_card_last4: z.string().optional(),
  customer_card_network: z.string().optional(),
  stale_days: z.number().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forecastAmount = searchParams.get("forecast_amount");
    const filter = searchParams.get("filter");

    if (filter === "cancelled") {
      const cancelled = await getCancelledOrders();
      return apiSuccess({ orders: cancelled });
    }

    if (forecastAmount) {
      const amountPaise = parseInt(forecastAmount, 10);
      if (!isNaN(amountPaise) && amountPaise > 0) {
        const colliding = await getPendingOrdersByAmount(amountPaise);
        return apiSuccess({
          colliding_orders: colliding,
          collision_count: colliding.length,
          has_collision: colliding.length > 0,
        });
      }
    }

    const pending = await getPendingOrders();
    return apiSuccess({ orders: pending });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const body = CreateOrderSchema.parse(rawBody);

    const expiresAt = body.stale_days ? Date.now() + body.stale_days * 24 * 60 * 60 * 1000 : undefined;

    const order = await createOrder({
      product_name: body.product_name,
      amount: body.amount,
      customer_name: body.customer_name || undefined,
      customer_vpa_hash: body.customer_vpa ? hashVpa(body.customer_vpa) : undefined,
      customer_card_last4: body.customer_card_last4 || undefined,
      customer_card_network: body.customer_card_network || undefined,
      expires_at: expiresAt,
    });

    return apiSuccess({ order });
  } catch (err) {
    return handleApiError(err);
  }
}
