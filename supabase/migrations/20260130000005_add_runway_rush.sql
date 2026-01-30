-- Create runway_rush_scores table for high scores
CREATE TABLE IF NOT EXISTS runway_rush_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  gems_collected INTEGER NOT NULL DEFAULT 0,
  distance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_runway_rush_scores_score
  ON runway_rush_scores(score DESC);

CREATE INDEX IF NOT EXISTS idx_runway_rush_scores_model
  ON runway_rush_scores(model_id, score DESC);

-- RLS policies
ALTER TABLE runway_rush_scores ENABLE ROW LEVEL SECURITY;

-- Anyone can view scores (for leaderboard)
CREATE POLICY "Anyone can view runway rush scores"
  ON runway_rush_scores FOR SELECT
  USING (true);

-- Models can insert their own scores
CREATE POLICY "Models can insert own scores"
  ON runway_rush_scores FOR INSERT
  WITH CHECK (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Admins can manage all scores
CREATE POLICY "Admins can manage all scores"
  ON runway_rush_scores FOR ALL
  USING (
    EXISTS (SELECT 1 FROM actors WHERE user_id = auth.uid() AND type = 'admin')
  );
