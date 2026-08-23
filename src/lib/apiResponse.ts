import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T extends object>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    const msg = err.issues.map((i) => `${i.path.join(".") || "field"}: ${i.message}`).join(", ");
    return apiError(`Invalid request: ${msg}`, 400);
  }
  console.error("API error:", err);
  const msg = err instanceof Error ? err.message : "Internal Server Error";
  return apiError(msg, 500);
}