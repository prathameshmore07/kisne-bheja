import { validateEnv } from "./env";
validateEnv();

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DATABASE_PATH || "./kisnebheja.db";

const db = new Database(path.resolve(process.cwd(), DB_PATH));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  amount INTEGER NOT NULL,          -- paise
  customer_name TEXT,
  customer_vpa_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | resolved | cancelled
  created_at INTEGER NOT NULL       -- unix ms
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  razorpay_payment_id TEXT,
  razorpay_payment_link_id TEXT,
  amount INTEGER NOT NULL,          -- paise
  payer_vpa_hash TEXT,
  status TEXT NOT NULL DEFAULT 'unresolved', -- unresolved | ambiguous | resolved | manual_review
  resolved_order_id TEXT,
  confidence REAL NOT NULL DEFAULT 0,
  received_at INTEGER NOT NULL,
  resolved_at INTEGER,
  FOREIGN KEY (resolved_order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS evidence_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id TEXT NOT NULL,
  candidate_order_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,        -- amount_match | timing | payer_history | order_age | link_metadata | conversation | negative | partial
  signal_weight REAL NOT NULL,      -- can be negative
  detail TEXT,                      -- human-readable reason
  confidence_after REAL NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  FOREIGN KEY (candidate_order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id TEXT,
  action TEXT NOT NULL,             -- webhook_received | evidence_added | clarification_sent | reply_interpreted | auto_resolved | approved | rejected | unlinked | manual_review
  actor TEXT NOT NULL,              -- system | gemini | merchant
  detail TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS simulated_chat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id TEXT NOT NULL,
  sender TEXT NOT NULL,             -- merchant_system | customer
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_id ON payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_amount ON payments(amount);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_amount ON orders(amount);
CREATE INDEX IF NOT EXISTS idx_evidence_payment ON evidence_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_evidence_candidate ON evidence_log(payment_id, candidate_order_id);
CREATE INDEX IF NOT EXISTS idx_audit_payment ON audit_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_chat_payment ON simulated_chat(payment_id);
`);

export default db;
