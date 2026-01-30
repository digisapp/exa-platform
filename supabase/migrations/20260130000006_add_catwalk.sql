-- Create catwalk_scores table for game scores
CREATE TABLE IF NOT EXISTS catwalk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  runway_id TEXT NOT NULL DEFAULT 'studio', -- which runway was played
  walk_score INTEGER NOT NULL DEFAULT 0,
  pose_score INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  gems_collected INTEGER NOT NULL DEFAULT 0,
  perfect_walks INTEGER NOT NULL DEFAULT 0, -- rhythm hits
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_catwalk_scores_total
  ON catwalk_scores(total_score DESC);

CREATE INDEX IF NOT EXISTS idx_catwalk_scores_model
  ON catwalk_scores(model_id, total_score DESC);

CREATE INDEX IF NOT EXISTS idx_catwalk_scores_runway
  ON catwalk_scores(runway_id, total_score DESC);

-- RLS policies
ALTER TABLE catwalk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view catwalk scores"
  ON catwalk_scores FOR SELECT
  USING (true);

CREATE POLICY "Models can insert own catwalk scores"
  ON catwalk_scores FOR INSERT
  WITH CHECK (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all catwalk scores"
  ON catwalk_scores FOR ALL
  USING (
    EXISTS (SELECT 1 FROM actors WHERE user_id = auth.uid() AND type = 'admin')
  );

-- Create catwalk_unlocks table for unlocked runways
CREATE TABLE IF NOT EXISTS catwalk_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  runway_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_id, runway_id)
);

-- RLS for unlocks
ALTER TABLE catwalk_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Models can view own unlocks"
  ON catwalk_unlocks FOR SELECT
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Models can insert own unlocks"
  ON catwalk_unlocks FOR INSERT
  WITH CHECK (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all unlocks"
  ON catwalk_unlocks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM actors WHERE user_id = auth.uid() AND type = 'admin')
  );
