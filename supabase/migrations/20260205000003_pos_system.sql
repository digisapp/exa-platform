-- =============================================
-- POS SYSTEM SUPPORT
-- Adds Point of Sale functionality to the shop
-- =============================================

-- Add POS flag to orders
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS is_pos_sale BOOLEAN DEFAULT FALSE;

-- Create index for POS orders
CREATE INDEX IF NOT EXISTS idx_shop_orders_pos ON shop_orders(is_pos_sale) WHERE is_pos_sale = TRUE;

-- POS Transactions table for daily reconciliation
CREATE TABLE IF NOT EXISTS pos_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to order
  order_id UUID REFERENCES shop_orders(id),
  order_number TEXT NOT NULL,

  -- Payment details
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'split')),
  amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  change_given DECIMAL(10,2) DEFAULT 0,

  -- Card details (if card payment)
  card_last_four TEXT,
  card_brand TEXT,
  stripe_payment_intent_id TEXT,

  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'voided', 'refunded')),

  -- Staff tracking
  staff_id UUID,
  staff_name TEXT,

  -- Terminal/Register info
  terminal_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  voided_at TIMESTAMPTZ,
  voided_by TEXT,
  void_reason TEXT
);

-- POS Cash Drawer sessions
CREATE TABLE IF NOT EXISTS pos_drawer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session details
  terminal_id TEXT NOT NULL,
  staff_id UUID,
  staff_name TEXT,

  -- Opening/closing
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,

  -- Cash counts
  opening_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_cash DECIMAL(10,2),
  expected_cash DECIMAL(10,2),
  cash_difference DECIMAL(10,2),

  -- Totals
  total_sales DECIMAL(10,2) DEFAULT 0,
  total_cash_sales DECIMAL(10,2) DEFAULT 0,
  total_card_sales DECIMAL(10,2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'reconciled')),

  -- Notes
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pos_transactions_order ON pos_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_date ON pos_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_method ON pos_transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_pos_drawer_status ON pos_drawer_sessions(status);

-- RLS Policies
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_drawer_sessions ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access pos_transactions"
  ON pos_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

CREATE POLICY "Admins full access pos_drawer_sessions"
  ON pos_drawer_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- Function to decrement stock (for atomic updates)
CREATE OR REPLACE FUNCTION decrement_stock(variant_id UUID, quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE shop_product_variants
  SET stock_quantity = stock_quantity - quantity
  WHERE id = variant_id
  AND stock_quantity >= quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for variant %', variant_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
