-- Add gem_balance column to models table
ALTER TABLE models ADD COLUMN IF NOT EXISTS gem_balance INTEGER DEFAULT 0;

-- Create daily_spin_history table to track spins
CREATE TABLE IF NOT EXISTS daily_spin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  gems_won INTEGER NOT NULL,
  spin_result TEXT NOT NULL, -- e.g., 'jackpot', '100_gems', '50_gems', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient daily spin lookups
CREATE INDEX IF NOT EXISTS idx_daily_spin_history_model_date
  ON daily_spin_history(model_id, created_at DESC);

-- RLS policies for daily_spin_history
ALTER TABLE daily_spin_history ENABLE ROW LEVEL SECURITY;

-- Models can view their own spin history
CREATE POLICY "Models can view own spin history"
  ON daily_spin_history FOR SELECT
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Models can insert their own spins (through API)
CREATE POLICY "Models can insert own spins"
  ON daily_spin_history FOR INSERT
  WITH CHECK (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Function to safely add gems to a model's balance
CREATE OR REPLACE FUNCTION add_gems_to_model(
  p_model_id UUID,
  p_gems INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE models
  SET gem_balance = COALESCE(gem_balance, 0) + p_gems
  WHERE id = p_model_id
  RETURNING gem_balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_gems_to_model(UUID, INTEGER) TO authenticated;
