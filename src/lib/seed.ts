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

  console.log("2. Inserting demo orders...");
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
      status: "resolved",
      created_at: new Date(now - 35 * 60_000).toISOString(),
    },
    {
      product_name: "Copper Water Bottle 1L",
      amount: 39900,
      customer_name: "Vikram Rao",
      customer_vpa_hash: hashVpa("vikram.rao@gpay"),
      status: "resolved",
      created_at: new Date(now - 50 * 60_000).toISOString(),
    },
  ];

  const { data: createdOrders, error: orderErr } = await supabase
    .from("orders")
    .insert(ordersToInsert)
    .select();

  if (orderErr) throw orderErr;
  console.log(`Inserted ${createdOrders.length} orders.`);

  const orderMap = new Map(createdOrders.map(o => [o.product_name, o.id]));

  console.log("3. Inserting demo payments...");
  const paymentsToInsert = [
    {
      razorpay_payment_id: "pay_bottle_002",
      amount: 39900,
      payer_vpa_hash: hashVpa("vikram.rao@gpay"),
      status: "resolved",
      resolved_order_id: orderMap.get("Copper Water Bottle 1L"),
      confidence: 0.92,
      received_at: new Date(now - 48 * 60_000).toISOString(),
      resolved_at: new Date(now - 48 * 60_000 + 1500).toISOString(),
    },
    {
      razorpay_payment_id: "pay_notebook_003",
      amount: 29900,
      payer_vpa_hash: hashVpa("rohit.singh@ybl"),
      status: "resolved",
      resolved_order_id: orderMap.get("Notebook Set (Pack of 3)"),
      confidence: 0.90,
      received_at: new Date(now - 33 * 60_000).toISOString(),
      resolved_at: new Date(now - 33 * 60_000 + 2000).toISOString(),
    },
    {
      razorpay_payment_id: "pay_ambiguous_004",
      amount: 49900,
      payer_vpa_hash: hashVpa("sana.ali@oksbi"),
      status: "ambiguous",
      confidence: 0.72,
      received_at: new Date(now - 14 * 60_000).toISOString(),
    },
    {
      razorpay_payment_id: "pay_demo_live_499",
      amount: 49900,
      status: "ambiguous",
      confidence: 0.48,
      received_at: new Date(now - 2 * 60_000).toISOString(),
    },
    {
      razorpay_payment_id: "pay_unmatched_006",
      amount: 125000,
      status: "manual_review",
      confidence: 0.0,
      received_at: new Date(now - 60 * 60_000).toISOString(),
    }
  ];

  const { data: createdPayments, error: payErr } = await supabase
    .from("payments")
    .insert(paymentsToInsert)
    .select();

  if (payErr) throw payErr;
  console.log(`Inserted ${createdPayments.length} payments.`);

  const livePay = createdPayments.find(p => p.razorpay_payment_id === "pay_demo_live_499");
  const blueId = orderMap.get("Blue Kurta");
  const redId = orderMap.get("Red Kurta");

  if (livePay && blueId && redId) {
    console.log("4. Inserting initial evidence for live demo payment...");
    await supabase.from("evidence_log").insert([
      {
        payment_id: livePay.id,
        candidate_order_id: blueId,
        signal_type: "amount_match",
        signal_weight: 0.45,
        detail: "Exact amount match ₹499.00 (2 competing orders)",
        confidence_after: 0.45,
        created_at: new Date(now - 2 * 60_000 + 100).toISOString(),
      },
      {
        payment_id: livePay.id,
        candidate_order_id: blueId,
        signal_type: "timing",
        signal_weight: 0.03,
        detail: "Payment received 42m after order creation",
        confidence_after: 0.48,
        created_at: new Date(now - 2 * 60_000 + 200).toISOString(),
      },
      {
        payment_id: livePay.id,
        candidate_order_id: redId,
        signal_type: "amount_match",
        signal_weight: 0.45,
        detail: "Exact amount match ₹499.00 (2 competing orders)",
        confidence_after: 0.45,
        created_at: new Date(now - 2 * 60_000 + 150).toISOString(),
      },
      {
        payment_id: livePay.id,
        candidate_order_id: redId,
        signal_type: "timing",
        signal_weight: 0.02,
        detail: "Payment received 45m after order creation",
        confidence_after: 0.47,
        created_at: new Date(now - 2 * 60_000 + 250).toISOString(),
      },
    ]);

    await supabase.from("audit_log").insert([
      {
        payment_id: livePay.id,
        action: "webhook_received",
        actor: "system",
        detail: "Webhook received for ₹499.00 from Razorpay (ID: pay_demo_live_499)",
        created_at: new Date(now - 2 * 60_000).toISOString(),
      },
      {
        payment_id: livePay.id,
        action: "evidence_added",
        actor: "system",
        detail: "Ambiguous collision between Blue Kurta (48%) and Red Kurta (47%)",
        created_at: new Date(now - 2 * 60_000 + 300).toISOString(),
      }
    ]);
  }

  console.log("SEEDING COMPLETED PERFECTLY!");
}

async function run() {
  await seedDatabase();
}

if (process.argv[1]?.includes("seed")) {
  run().catch(console.error);
}
