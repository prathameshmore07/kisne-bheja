import Razorpay from "razorpay";
import { validateEnv } from "./env";

export function getRazorpay(): Razorpay | null {
  validateEnv();
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    return null;
  }

  try {
    return new Razorpay({ key_id, key_secret });
  } catch (err) {
    console.error("Failed to initialize Razorpay client:", err);
    return null;
  }
}

export async function createPaymentLink(input: {
  amount: number; // paise
  description: string;
  orderId?: string; // if set, embedded in notes -> feeds link_metadata signal
  customerVpa?: string;
}) {
  validateEnv();
  const key_id =
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    "rzp_test_TSp280vD1KUNbi";
  const rzp = getRazorpay();

  if (!rzp) {
    return {
      id: `plink_client_${Date.now()}`,
      short_url: `https://rzp.io/l/demo_${Date.now()}`,
      key_id,
      auth_warning: "Razorpay credentials not fully configured in environment. Inline checkout modal is ready.",
    };
  }

  try {
    const payload: any = {
      amount: input.amount,
      currency: "INR",
      description: input.description,
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: input.orderId ? { kisnebheja_order_id: input.orderId } : {},
    };

    const link = (await rzp.paymentLink.create(payload as any)) as {
      id: string;
      short_url: string;
      upi_link?: string;
    };

    return {
      id: link.id,
      short_url: link.short_url,
      upi_link: link.upi_link,
      key_id,
    };
  } catch (err: any) {
    const description = err?.error?.description || err?.message || "Razorpay API error";
    console.warn("Razorpay paymentLink.create API warning:", description);
    return {
      id: `plink_client_${Date.now()}`,
      short_url: `https://rzp.io/l/demo_${Date.now()}`,
      key_id,
      auth_warning: description,
    };
  }
}
