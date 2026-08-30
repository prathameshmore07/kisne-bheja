-- ==============================================================================
-- Kisne Bheja — PostgreSQL Database Schema
-- Supabase Core Schema & Realtime Replication Policy
-- ==============================================================================

-- Enable pgcrypto for native UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Custom Postgres Enum Types
-- ------------------------------------------------------------------------------
CREATE TYPE order_status AS ENUM ('pending', 'resolved', 'cancelled');
CREATE TYPE payment_status AS ENUM ('unresolved', 'ambiguous', 'resolved', 'manual_review');
CREATE TYPE signal_type AS ENUM (
  'amount_match',
  'timing',
  'payer_history',
  'card_proxy',
  'order_age',
  'link_metadata',
  'merchant_rule',
  'conversation',
  'negative',
  'partial',
  'batch_assignment'
);
CREATE TYPE audit_actor AS ENUM ('system', 'gemini', 'merchant');
CREATE TYPE audit_action AS ENUM (
  'webhook_received',
  'evidence_added',
  'clarification_sent',
  'reply_interpreted',
  'auto_resolved',
  'batch_resolved',
  'approved',
  'rejected',
  'unlinked',
  'manual_review',
  'payment_failed',
  'batch_assignment'
);
CREATE TYPE chat_sender AS ENUM ('merchant_system', 'customer');

-- ------------------------------------------------------------------------------
-- 2. Core Tables
-- ------------------------------------------------------------------------------

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  amount INTEGER NOT NULL,                       -- Amount in paise (e.g. 49900 = ₹499.00)
  customer_name TEXT,
  customer_identity_hash TEXT,                   -- SHA-256 hash of customer identifier (card proxy, bank code, wallet, VPA)
  customer_card_last4 TEXT,                      -- Card Last-4 identifier proxy
  customer_card_network TEXT,                    -- Visa, MasterCard, RuPay
  status order_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ,                        -- Automated order expiry timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_benchmark BOOLEAN NOT NULL DEFAULT false
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_payment_id TEXT,
  razorpay_payment_link_id TEXT,
  amount INTEGER NOT NULL,                       -- Amount in paise
  payer_identity_hash TEXT,                      -- SHA-256 hash of payer identifier
  payment_method TEXT NOT NULL DEFAULT 'card',   -- 'card' | 'upi' | 'netbanking' | 'wallet'
  payer_card_last4 TEXT,
  payer_card_network TEXT,
  status payment_status NOT NULL DEFAULT 'unresolved',
  resolved_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  confidence REAL NOT NULL DEFAULT 0,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  is_benchmark BOOLEAN NOT NULL DEFAULT false
);

-- Evidence Log Table (Immutable Confidence Ledger)
CREATE TABLE IF NOT EXISTS evidence_log (
  id BIGSERIAL PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  candidate_order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  signal_type signal_type NOT NULL,
  signal_weight REAL NOT NULL,
  detail TEXT,
  confidence_after REAL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Log Table (Operational History Stream)
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  action audit_action NOT NULL,
  actor audit_actor NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Simulated Chat Table (Clarification History)
CREATE TABLE IF NOT EXISTS simulated_chat (
  id BIGSERIAL PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  sender chat_sender NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Merchant Rules Table (Custom Matching Rules)
CREATE TABLE IF NOT EXISTS merchant_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL,                  -- 'customer_name' | 'customer_vpa' | 'product_keyword'
  condition_value TEXT NOT NULL,
  weight_boost REAL NOT NULL DEFAULT 0.15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. Performance Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_id ON payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_amount ON payments(amount);
CREATE INDEX IF NOT EXISTS idx_payments_resolved_order ON payments(resolved_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_received_at ON payments(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_amount ON orders(amount);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(expires_at);

CREATE INDEX IF NOT EXISTS idx_evidence_payment ON evidence_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_evidence_candidate ON evidence_log(candidate_order_id);
CREATE INDEX IF NOT EXISTS idx_evidence_payment_candidate ON evidence_log(payment_id, candidate_order_id);

CREATE INDEX IF NOT EXISTS idx_audit_payment ON audit_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_payment ON simulated_chat(payment_id);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON simulated_chat(created_at ASC);

-- ------------------------------------------------------------------------------
-- 4. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulated_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_rules ENABLE ROW LEVEL SECURITY;

-- Service Role (Full Backend Access)
CREATE POLICY "Service role full access on orders" ON orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on payments" ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on evidence_log" ON evidence_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on audit_log" ON audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on simulated_chat" ON simulated_chat FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on merchant_rules" ON merchant_rules FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon / Authenticated Read Subscriptions for Realtime
CREATE POLICY "Anon realtime select on payments" ON payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon realtime select on evidence_log" ON evidence_log FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon realtime select on simulated_chat" ON simulated_chat FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon realtime select on merchant_rules" ON merchant_rules FOR SELECT TO anon, authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 5. Supabase Realtime Replication
-- ------------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE payments, evidence_log, simulated_chat, merchant_rules;
