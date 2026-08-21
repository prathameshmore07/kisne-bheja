import db from "./db";
import { randomUUID } from "crypto";

function now() {
  return Date.now();
}

function clearAll() {
  db.exec(`
    DELETE FROM simulated_chat;
    DELETE FROM audit_log;
    DELETE FROM evidence_log;
    DELETE FROM payments;
    DELETE FROM orders;
  `);
}

function addOrder(product_name: string, amount: number, customer_name: string, vpaHash: string, ageMinutesAgo: number) {
  const id = randomUUID();
  const created_at = now() - ageMinutesAgo * 60_000;
  db.prepare(`
    INSERT INTO orders (id, product_name, amount, customer_name, customer_vpa_hash, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `).run(id, product_name, amount, customer_name, vpaHash, created_at);
  return id;
}

function seed() {
  clearAll();

  // THE core demo pair — identical amount, genuinely ambiguous
  addOrder("Blue Kurta", 49900, "Priya Sharma", "vpa_hash_priya_001", 4);
  addOrder("Red Kurta", 49900, "Aman Verma", "vpa_hash_aman_002", 6);

  // filler orders for realism / later benchmark pool
  addOrder("Yoga Mat", 79900, "Neha Gupta", "vpa_hash_neha_003", 12);
  addOrder("Notebook Set", 29900, "Rohit Singh", "vpa_hash_rohit_004", 20);
  addOrder("Tuition Fee - August", 49900, "Kabir Khan", "vpa_hash_kabir_005", 45); // another 499 collision on purpose
  addOrder("Green Kurta", 49900, "Sana Ali", "vpa_hash_sana_006", 3);
  addOrder("Water Bottle", 39900, "Vikram Rao", "vpa_hash_vikram_007", 8);

  console.log("Seed complete:", db.prepare("SELECT COUNT(*) as c FROM orders").get());
}

seed();
