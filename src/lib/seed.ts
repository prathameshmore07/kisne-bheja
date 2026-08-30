import { getSupabaseServer } from "./supabaseServer";
import { hashPayerIdentity } from "./hash";

export async function seedDatabase() {
  console.log("Connecting to Supabase...");
  const supabase = getSupabaseServer();

  console.log("1. Cleaning old data...");
  await supabase.from("simulated_chat").delete().neq("id", 0);
  await supabase.from("evidence_log").delete().neq("id", 0);
  await supabase.from("audit_log").delete().neq("id", 0);
  await supabase.from("payments").delete().neq("amount", -999999);
  await supabase.from("orders").delete().neq("amount", -999999);
  console.log("Old data cleaned.");

  const now = Date.now();

  console.log("2. Inserting pending demo catalog orders (awaiting real payment webhooks)...");
  const priyaCardHash = hashPayerIdentity("1111_visa"); // Matches Razorpay published test card: 4111 1111 1111 1111 (Visa)
  const amanCardHash = hashPayerIdentity("4242_mastercard");
  const sanaCardHash = hashPayerIdentity("8888_rupay");
  const kabirNetbankingHash = hashPayerIdentity("HDFC");
  const nehaWalletHash = hashPayerIdentity("paytm_neha@paytm");
  const rohitCardHash = hashPayerIdentity("4321_visa");
  const vikramNetbankingHash = hashPayerIdentity("SBIN");

  const ordersToInsert = [
    {
      product_name: "Blue Kurta",
      amount: 49900,
      customer_name: "Priya Sharma",
      customer_identity_hash: priyaCardHash,
      customer_card_last4: "1111",
      customer_card_network: "Visa",
      status: "pending",
      created_at: new Date(now - 42 * 60_000).toISOString(),
    },
    {
      product_name: "Red Kurta",
      amount: 49900,
      customer_name: "Aman Verma",
      customer_identity_hash: amanCardHash,
      customer_card_last4: "4242",
      customer_card_network: "Mastercard",
      status: "pending",
      created_at: new Date(now - 45 * 60_000).toISOString(),
    },
    {
      product_name: "Green Kurta",
      amount: 64900,
      customer_name: "Sana Ali",
      customer_identity_hash: sanaCardHash,
      customer_card_last4: "8888",
      customer_card_network: "RuPay",
      status: "pending",
      created_at: new Date(now - 15 * 60_000).toISOString(),
    },
    {
      product_name: "Tuition Fee - August",
      amount: 150000,
      customer_name: "Kabir Khan",
      customer_identity_hash: kabirNetbankingHash,
      status: "pending",
      created_at: new Date(now - 90 * 60_000).toISOString(),
    },
    {
      product_name: "Yoga Mat - Black",
      amount: 79900,
      customer_name: "Neha Gupta",
      customer_identity_hash: nehaWalletHash,
      status: "pending",
      created_at: new Date(now - 25 * 60_000).toISOString(),
    },
    {
      product_name: "Notebook Set (Pack of 3)",
      amount: 29900,
      customer_name: "Rohit Singh",
      customer_identity_hash: rohitCardHash,
      customer_card_last4: "4321",
      customer_card_network: "Visa",
      status: "pending",
      created_at: new Date(now - 35 * 60_000).toISOString(),
    },
    {
      product_name: "Copper Water Bottle 1L",
      amount: 39900,
      customer_name: "Vikram Rao",
      customer_identity_hash: vikramNetbankingHash,
      status: "pending",
      created_at: new Date(now - 50 * 60_000).toISOString(),
    },
  ];

  let { data: createdOrders, error: orderErr } = await supabase
    .from("orders")
    .insert(ordersToInsert)
    .select();

  // If remote schema uses customer_vpa_hash instead of customer_identity_hash
  if (orderErr && (orderErr.message?.includes("customer_identity_hash") || orderErr.code === "PGRST204")) {
    const legacyOrders = ordersToInsert.map((o: any) => {
      const { customer_identity_hash, ...rest } = o;
      return { ...rest, customer_vpa_hash: customer_identity_hash };
    });
    const retry = await supabase.from("orders").insert(legacyOrders).select();
    createdOrders = retry.data;
    orderErr = retry.error;
  }

  if (orderErr) throw orderErr;
  console.log(`Inserted ${createdOrders?.length ?? ordersToInsert.length} pending demo catalog orders.`);
  console.log("Database initialized cleanly. Payments table is empty, ready to receive genuine Razorpay test-mode webhooks.");
}

async function run() {
  await seedDatabase();
}

if (process.argv[1]?.includes("seed")) {
  run().catch(console.error);
}
