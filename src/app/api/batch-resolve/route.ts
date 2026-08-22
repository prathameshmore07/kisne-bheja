import { NextRequest, NextResponse } from "next/server";
import { runBatchResolution } from "@/lib/batchResolver";

export async function POST(req: NextRequest) {
  try {
    const result = runBatchResolution();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Batch resolution error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Batch resolution failed" },
      { status: 500 }
    );
  }
}
