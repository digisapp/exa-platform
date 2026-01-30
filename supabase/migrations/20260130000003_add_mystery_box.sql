-- Create mystery_box_history table to track box openings
CREATE TABLE IF NOT EXISTS mystery_box_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  gems_won INTEGER NOT NULL,
  box_tier TEXT NOT NULL, -- 'common', 'rare', 'epic', 'legendary'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient weekly box lookups
CREATE INDEX IF NOT EXISTS idx_mystery_box_history_model_date
  ON mystery_box_history(model_id, created_at DESC);

-- RLS policies for mystery_box_history
ALTER TABLE mystery_box_history ENABLE ROW LEVEL SECURITY;

-- Models can view their own box history
CREATE POLICY "Models can view own box history"
  ON mystery_box_history FOR SELECT
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Models can insert their own box openings (through API)
CREATE POLICY "Models can insert own box openings"
  ON mystery_box_history FOR INSERT
  WITH CHECK (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Admins can manage all box history
CREATE POLICY "Admins can manage all box history"
  ON mystery_box_history FOR ALL
  USING (
    EXISTS (SELECT 1 FROM actors WHERE user_id = auth.uid() AND type = 'admin')
  );
