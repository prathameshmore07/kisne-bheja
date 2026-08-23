import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    database: false,
    razorpay_configured: !!process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== "rzp_test_xxxxxxxxxxxxxx",
    gemini_configured: !!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("xxxxxxxx"),
  };

  try {
    db.prepare("SELECT 1").get();
    checks.database = true;
  } catch {
    checks.database = false;
  }

  const healthy = checks.database;
  return NextResponse.json({ healthy, checks }, { status: healthy ? 200 : 503 });
}
