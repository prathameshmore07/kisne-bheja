import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    database: false,
    razorpay_configured: !!process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== "rzp_test_xxxxxxxxxxxxxx",
    gemini_configured: !!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("xxxxxxxx"),
  };

  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("orders").select("id").limit(1);
    checks.database = !error;
  } catch {
    checks.database = false;
  }

  const healthy = checks.database;
  return NextResponse.json({ healthy, checks }, { status: healthy ? 200 : 503 });
}
