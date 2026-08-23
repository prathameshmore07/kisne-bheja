import fs from "fs";
import path from "path";

const REQUIRED = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "GEMINI_API_KEY",
] as const;

let validated = false;

export function validateEnv() {
  if (validated) return;

  // If running via tsx/node directly, load .env.local if present
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    try {
      const content = fs.readFileSync(envLocalPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const idx = trimmed.indexOf("=");
          if (idx !== -1) {
            const k = trimmed.substring(0, idx).trim();
            const v = trimmed.substring(idx + 1).trim();
            if (!process.env[k]) {
              process.env[k] = v;
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (!process.env.DATABASE_PATH) {
    process.env.DATABASE_PATH = "./kisnebheja.db";
  }

  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(
      `Warning: Missing environment variables: ${missing.join(", ")}. Check .env.local against .env.example.`
    );
  }
}