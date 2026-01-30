-- Create lifestyle_activities table to track model activities
CREATE TABLE IF NOT EXISTS lifestyle_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'workout', 'coffee', 'content', 'event', 'wellness', 'network'
  gems_change INTEGER NOT NULL, -- positive for earned, negative for spent
  streak_day INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient activity lookups
CREATE INDEX IF NOT EXISTS idx_lifestyle_activities_model_date
  ON lifestyle_activities(model_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lifestyle_activities_type
  ON lifestyle_activities(model_id, activity_type, created_at DESC);

-- RLS policies for lifestyle_activities
ALTER TABLE lifestyle_activities ENABLE ROW LEVEL SECURITY;

-- Models can view their own activity history
CREATE POLICY "Models can view own activities"
  ON lifestyle_activities FOR SELECT
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Models can insert their own activities (through API)
CREATE POLICY "Models can insert own activities"
  ON lifestyle_activities FOR INSERT
  WITH CHECK (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Admins can manage all activities
CREATE POLICY "Admins can manage all activities"
  ON lifestyle_activities FOR ALL
  USING (
    EXISTS (SELECT 1 FROM actors WHERE user_id = auth.uid() AND type = 'admin')
  );

-- Create lifestyle_stats table for tracking streaks and totals
CREATE TABLE IF NOT EXISTS lifestyle_stats (
  model_id UUID PRIMARY KEY REFERENCES models(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_workouts INTEGER DEFAULT 0,
  total_content INTEGER DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  total_wellness INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for lifestyle_stats
ALTER TABLE lifestyle_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Models can view own stats"
  ON lifestyle_stats FOR SELECT
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Models can upsert own stats"
  ON lifestyle_stats FOR ALL
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all stats"
  ON lifestyle_stats FOR ALL
  USING (
    EXISTS (SELECT 1 FROM actors WHERE user_id = auth.uid() AND type = 'admin')
  );
