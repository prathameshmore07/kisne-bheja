import crypto from "crypto";

// Hashes a raw UPI VPA so we never store the actual identifier — only
// enough to recognize "this is the same payer as before" (payer_history signal).
export function hashVpa(vpa: string): string {
  return crypto.createHash("sha256").update(vpa.toLowerCase().trim()).digest("hex").slice(0, 16);
}
