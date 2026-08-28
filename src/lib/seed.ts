import { getSupabaseServer } from "./supabaseServer";
import { hashVpa } from "./hash";

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
  const ordersToInsert = [
    {
      product_name: "Blue Kurta",
      amount: 49900,
      customer_name: "Priya Sharma",
      customer_vpa_hash: hashVpa("priya.sharma@okhdfcbank"),
      status: "pending",
      created_at: new Date(now - 42 * 60_000).toISOString(),
    },
    {
      product_name: "Red Kurta",
      amount: 49900,
      customer_name: "Aman Verma",
      customer_vpa_hash: hashVpa("aman.verma@okaxis"),
      status: "pending",
      created_at: new Date(now - 45 * 60_000).toISOString(),
    },
    {
      product_name: "Green Kurta",
      amount: 64900,
      customer_name: "Sana Ali",
      customer_vpa_hash: hashVpa("sana.ali@oksbi"),
      status: "pending",
      created_at: new Date(now - 15 * 60_000).toISOString(),
    },
    {
      product_name: "Tuition Fee - August",
      amount: 150000,
      customer_name: "Kabir Khan",
      customer_vpa_hash: hashVpa("kabir.khan@icici"),
      status: "pending",
      created_at: new Date(now - 90 * 60_000).toISOString(),
    },
    {
      product_name: "Yoga Mat - Black",
      amount: 79900,
      customer_name: "Neha Gupta",
      customer_vpa_hash: hashVpa("neha.gupta@paytm"),
      status: "pending",
      created_at: new Date(now - 25 * 60_000).toISOString(),
    },
    {
      product_name: "Notebook Set (Pack of 3)",
      amount: 29900,
      customer_name: "Rohit Singh",
      customer_vpa_hash: hashVpa("rohit.singh@ybl"),
      status: "pending",
      created_at: new Date(now - 35 * 60_000).toISOString(),
    },
    {
      product_name: "Copper Water Bottle 1L",
      amount: 39900,
      customer_name: "Vikram Rao",
      customer_vpa_hash: hashVpa("vikram.rao@gpay"),
      status: "pending",
      created_at: new Date(now - 50 * 60_000).toISOString(),
    },
  ];

  const { data: createdOrders, error: orderErr } = await supabase
    .from("orders")
    .insert(ordersToInsert)
    .select();

  if (orderErr) throw orderErr;
  console.log(`Inserted ${createdOrders.length} pending demo catalog orders.`);
  console.log("Database initialized cleanly. Payments table is empty, ready to receive genuine Razorpay test-mode webhooks.");
}

async function run() {
  await seedDatabase();
}

if (process.argv[1]?.includes("seed")) {
  run().catch(console.error);
}
