-- Add Payoneer integration tables and fields
-- Run this migration in Supabase SQL Editor

-- 1. Add country_code to models table
ALTER TABLE models ADD COLUMN IF NOT EXISTS country_code TEXT;

-- 2. Create payoneer_accounts table
CREATE TABLE IF NOT EXISTS payoneer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  payee_id TEXT NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  country TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
  can_receive_payments BOOLEAN NOT NULL DEFAULT false,
  registration_link TEXT,
  registration_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(model_id),
  UNIQUE(payee_id)
);

-- 3. Create payoneer_payouts table
CREATE TABLE IF NOT EXISTS payoneer_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_request_id UUID NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  payoneer_payout_id TEXT NOT NULL UNIQUE,
  payee_id TEXT NOT NULL,
  amount_usd NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  failure_reason TEXT,
  payoneer_created_at TIMESTAMPTZ,
  payoneer_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Add Payoneer fields to withdrawal_requests
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'stripe' CHECK (payout_method IN ('stripe', 'payoneer'));
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS payoneer_account_id UUID REFERENCES payoneer_accounts(id);
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS payoneer_payout_id TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS external_reference TEXT;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payoneer_accounts_model_id ON payoneer_accounts(model_id);
CREATE INDEX IF NOT EXISTS idx_payoneer_accounts_payee_id ON payoneer_accounts(payee_id);
CREATE INDEX IF NOT EXISTS idx_payoneer_accounts_status ON payoneer_accounts(status);
CREATE INDEX IF NOT EXISTS idx_payoneer_payouts_withdrawal_request_id ON payoneer_payouts(withdrawal_request_id);
CREATE INDEX IF NOT EXISTS idx_payoneer_payouts_payee_id ON payoneer_payouts(payee_id);
CREATE INDEX IF NOT EXISTS idx_payoneer_payouts_status ON payoneer_payouts(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_payout_method ON withdrawal_requests(payout_method);

-- 6. Enable RLS on new tables
ALTER TABLE payoneer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payoneer_payouts ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for payoneer_accounts
-- Models can view their own Payoneer account
DROP POLICY IF EXISTS "Models can view own payoneer account" ON payoneer_accounts;
CREATE POLICY "Models can view own payoneer account" ON payoneer_accounts
  FOR SELECT
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Models can insert their own Payoneer account
DROP POLICY IF EXISTS "Models can create own payoneer account" ON payoneer_accounts;
CREATE POLICY "Models can create own payoneer account" ON payoneer_accounts
  FOR INSERT
  WITH CHECK (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Models can update their own Payoneer account
DROP POLICY IF EXISTS "Models can update own payoneer account" ON payoneer_accounts;
CREATE POLICY "Models can update own payoneer account" ON payoneer_accounts
  FOR UPDATE
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Admins can do everything
DROP POLICY IF EXISTS "Admins full access to payoneer_accounts" ON payoneer_accounts;
CREATE POLICY "Admins full access to payoneer_accounts" ON payoneer_accounts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors WHERE user_id = auth.uid() AND type = 'admin'
    )
  );

-- 8. RLS policies for payoneer_payouts (admin only)
DROP POLICY IF EXISTS "Admins full access to payoneer_payouts" ON payoneer_payouts;
CREATE POLICY "Admins full access to payoneer_payouts" ON payoneer_payouts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors WHERE user_id = auth.uid() AND type = 'admin'
    )
  );

-- Models can view their own payouts
DROP POLICY IF EXISTS "Models can view own payoneer payouts" ON payoneer_payouts;
CREATE POLICY "Models can view own payoneer payouts" ON payoneer_payouts
  FOR SELECT
  USING (
    withdrawal_request_id IN (
      SELECT wr.id FROM withdrawal_requests wr
      JOIN models m ON m.id = wr.model_id
      WHERE m.user_id = auth.uid()
    )
  );

-- 9. Add updated_at trigger for payoneer tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payoneer_accounts_updated_at ON payoneer_accounts;
CREATE TRIGGER update_payoneer_accounts_updated_at
  BEFORE UPDATE ON payoneer_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payoneer_payouts_updated_at ON payoneer_payouts;
CREATE TRIGGER update_payoneer_payouts_updated_at
  BEFORE UPDATE ON payoneer_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
