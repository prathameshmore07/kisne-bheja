import crypto from "crypto";

/**
 * Hashes a raw payer identifier (card last4+network, bank code, wallet ID, UPI VPA, or contact)
 * so we never store raw card numbers, contact info, or identifiers directly — only enough
 * to recognize "this is the same payer as before" (payer_history signal).
 */
export function hashPayerIdentity(rawIdentifier: string): string {
  return crypto
    .createHash("sha256")
    .update(rawIdentifier.toLowerCase().trim())
    .digest("hex")
    .slice(0, 16);
}

/**
 * Backward-compatible alias for hashPayerIdentity.
 */
export function hashVpa(vpa: string): string {
  return hashPayerIdentity(vpa);
}

/**
 * Extracts the appropriate identity proxy from a Razorpay payment entity based on payment method:
 * - Card: last4 + network (e.g. "1111_visa")
 * - Netbanking: bank code (e.g. "HDFC", "SBIN")
 * - Wallet: wallet provider name + optional email/contact (e.g. "paytm_9876543210")
 * - UPI: VPA handle (e.g. "priya@okhdfcbank")
 */
export function extractPayerIdentifier(paymentEntity: any): string | undefined {
  if (!paymentEntity) return undefined;

  const method = (paymentEntity.method || "").toLowerCase();

  if (method === "card") {
    const last4 = paymentEntity.card?.last4;
    const network = paymentEntity.card?.network;
    if (last4) {
      return network ? `${last4}_${network}` : `${last4}`;
    }
  } else if (method === "netbanking") {
    if (paymentEntity.bank) {
      return String(paymentEntity.bank);
    }
  } else if (method === "wallet") {
    const contactInfo = paymentEntity.email || paymentEntity.contact;
    if (paymentEntity.wallet) {
      return contactInfo ? `${paymentEntity.wallet}_${contactInfo}` : String(paymentEntity.wallet);
    }
    if (contactInfo) {
      return String(contactInfo);
    }
  } else if (method === "upi") {
    const vpa = paymentEntity.vpa || paymentEntity.customer?.vpa;
    if (vpa) {
      return String(vpa);
    }
  }

  // Fallback checks if method was missing or unmapped
  if (paymentEntity.card?.last4) {
    const last4 = paymentEntity.card.last4;
    const network = paymentEntity.card.network;
    return network ? `${last4}_${network}` : `${last4}`;
  }
  if (paymentEntity.vpa || paymentEntity.customer?.vpa) {
    return String(paymentEntity.vpa || paymentEntity.customer?.vpa);
  }
  if (paymentEntity.bank) {
    return String(paymentEntity.bank);
  }
  if (paymentEntity.wallet) {
    const contactInfo = paymentEntity.email || paymentEntity.contact;
    return contactInfo ? `${paymentEntity.wallet}_${contactInfo}` : String(paymentEntity.wallet);
  }
  if (paymentEntity.email || paymentEntity.contact) {
    return String(paymentEntity.email || paymentEntity.contact);
  }

  return undefined;
}
