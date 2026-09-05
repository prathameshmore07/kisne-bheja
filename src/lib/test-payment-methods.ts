/**
 * UNIT TEST: Multi-Payment-Method & Identity Proxies
 * 
 * Purpose: Verifies payer identity extraction and hash matching across cards (last4 + network),
 * netbanking (bank code), and wallets (provider).
 */
import { scorePayerHistory } from "./scorer";
import { extractPayerIdentifier, hashPayerIdentity } from "./hash";

async function main() {
  console.log("=== Running isolated test: test-payment-methods ===");

  console.log("--- Feature 6.1: Card Last-4 + Network Identity Proxy ---");
  const cardId = extractPayerIdentifier({ method: "card", card: { last4: "4242", network: "visa" } });
  console.log("Extracted card identifier:", cardId);
  const cardHash = hashPayerIdentity(cardId!);
  const cardHashSignal = scorePayerHistory(cardHash, cardHash);
  console.log("Card hash match signal:", cardHashSignal);

  const directCardSignal = scorePayerHistory(
    undefined,
    undefined,
    { last4: "4242", network: "visa" },
    { last4: "4242", network: "visa" }
  );
  console.log("Direct card metadata match signal:", directCardSignal);

  if (cardHashSignal && cardHashSignal.weight === 0.35 && directCardSignal?.weight === 0.35) {
    console.log("✓ Card payments correctly use Card Last-4 + Network as identity proxy (+35% score).");
  } else {
    console.error("✗ Card identity proxy matching failed");
    process.exit(1);
  }

  console.log("\n--- Feature 6.2: Netbanking Bank Code Identity Proxy ---");
  const bankId = extractPayerIdentifier({ method: "netbanking", bank: "HDFC" });
  console.log("Extracted netbanking identifier:", bankId);
  const bankHash = hashPayerIdentity(bankId!);
  const bankSignal = scorePayerHistory(bankHash, bankHash);
  console.log("Bank identity match signal:", bankSignal);
  if (bankSignal && bankSignal.weight === 0.35) {
    console.log("✓ Netbanking payments match bank identity proxy (+35% score).");
  } else {
    console.error("✗ Netbanking identity proxy matching failed");
    process.exit(1);
  }

  console.log("\n--- Feature 6.3: Wallet Identity Proxy ---");
  const walletId = extractPayerIdentifier({ method: "wallet", wallet: "paytm", contact: "+919876543210" });
  console.log("Extracted wallet identifier:", walletId);
  const walletHash = hashPayerIdentity(walletId!);
  const walletSignal = scorePayerHistory(walletHash, walletHash);
  console.log("Wallet identity match signal:", walletSignal);
  if (walletSignal && walletSignal.weight === 0.35) {
    console.log("✓ Wallet payments match wallet identity proxy (+35% score).");
  } else {
    console.error("✗ Wallet identity proxy matching failed");
    process.exit(1);
  }

  console.log("✅ test-payment-methods completed successfully.\n");
}

main().catch(console.error);
