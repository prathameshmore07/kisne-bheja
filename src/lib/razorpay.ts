import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export async function createPaymentLink(input: {
  amount: number; // paise
  description: string;
  orderId?: string; // if set, embedded in notes -> feeds link_metadata signal
}) {
  const link = (await razorpay.paymentLink.create({
    amount: input.amount,
    currency: "INR",
    description: input.description,
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: input.orderId ? { kisnebheja_order_id: input.orderId } : {},
  } as any)) as { id: string; short_url: string };

  return {
    id: link.id,
    short_url: link.short_url,
  };
}
