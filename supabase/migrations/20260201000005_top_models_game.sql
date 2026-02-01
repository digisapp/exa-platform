-- =============================================
-- TOP MODELS SWIPE GAME
-- =============================================

-- Votes table (tracks all swipes)
CREATE TABLE IF NOT EXISTS top_model_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID REFERENCES actors(id) ON DELETE SET NULL,
  voter_fingerprint TEXT,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'pass')),
  points INTEGER NOT NULL DEFAULT 1,
  is_boosted BOOLEAN DEFAULT false,
  is_revealed BOOLEAN DEFAULT false,
  coins_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard cache (updated in real-time)
CREATE TABLE IF NOT EXISTS top_model_leaderboard (
  model_id UUID PRIMARY KEY REFERENCES models(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  today_points INTEGER DEFAULT 0,
  week_points INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_boosts INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- User session tracking (for 24-hour cooldown)
CREATE TABLE IF NOT EXISTS top_model_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint TEXT,
  models_swiped UUID[] DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_top_votes_model ON top_model_votes(model_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_top_votes_voter ON top_model_votes(voter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_top_votes_fingerprint ON top_model_votes(voter_fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_top_leaderboard_today ON top_model_leaderboard(today_points DESC);
CREATE INDEX IF NOT EXISTS idx_top_leaderboard_week ON top_model_leaderboard(week_points DESC);
CREATE INDEX IF NOT EXISTS idx_top_leaderboard_total ON top_model_leaderboard(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_top_sessions_user ON top_model_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_top_sessions_fingerprint ON top_model_sessions(fingerprint);

-- RLS
ALTER TABLE top_model_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_model_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_model_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON top_model_leaderboard;
DROP POLICY IF EXISTS "Anyone can vote" ON top_model_votes;
DROP POLICY IF EXISTS "Anyone can view votes" ON top_model_votes;
DROP POLICY IF EXISTS "Anyone can manage sessions" ON top_model_sessions;

-- Anyone can read leaderboard
CREATE POLICY "Anyone can view leaderboard"
  ON top_model_leaderboard FOR SELECT
  USING (true);

-- Anyone can insert votes (anonymous game)
CREATE POLICY "Anyone can vote"
  ON top_model_votes FOR INSERT
  WITH CHECK (true);

-- Anyone can view votes (for leaderboard calculations)
CREATE POLICY "Anyone can view votes"
  ON top_model_votes FOR SELECT
  USING (true);

-- Anyone can manage sessions (supports anonymous users)
CREATE POLICY "Anyone can manage sessions"
  ON top_model_sessions FOR ALL
  USING (true);

-- Function to record vote and update leaderboard atomically
CREATE OR REPLACE FUNCTION record_top_model_vote(
  p_voter_id UUID,
  p_voter_fingerprint TEXT,
  p_model_id UUID,
  p_vote_type TEXT,
  p_points INTEGER,
  p_is_boosted BOOLEAN,
  p_is_revealed BOOLEAN,
  p_coins_spent INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_vote_id UUID;
BEGIN
  -- Insert vote
  INSERT INTO top_model_votes (
    voter_id, voter_fingerprint, model_id, vote_type,
    points, is_boosted, is_revealed, coins_spent
  ) VALUES (
    p_voter_id, p_voter_fingerprint, p_model_id, p_vote_type,
    p_points, p_is_boosted, p_is_revealed, p_coins_spent
  ) RETURNING id INTO v_vote_id;

  -- Update leaderboard only for likes
  IF p_vote_type = 'like' THEN
    INSERT INTO top_model_leaderboard (model_id, total_points, today_points, week_points, total_likes, total_boosts)
    VALUES (p_model_id, p_points, p_points, p_points, 1, CASE WHEN p_is_boosted THEN 1 ELSE 0 END)
    ON CONFLICT (model_id) DO UPDATE SET
      total_points = top_model_leaderboard.total_points + p_points,
      today_points = top_model_leaderboard.today_points + p_points,
      week_points = top_model_leaderboard.week_points + p_points,
      total_likes = top_model_leaderboard.total_likes + 1,
      total_boosts = top_model_leaderboard.total_boosts + CASE WHEN p_is_boosted THEN 1 ELSE 0 END,
      last_updated = NOW();
  END IF;

  RETURN jsonb_build_object('success', true, 'vote_id', v_vote_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create session
CREATE OR REPLACE FUNCTION get_or_create_top_model_session(
  p_user_id UUID,
  p_fingerprint TEXT
) RETURNS JSONB AS $$
DECLARE
  v_session top_model_sessions%ROWTYPE;
  v_total_models INTEGER;
BEGIN
  -- Get total swipeable models count
  SELECT COUNT(*) INTO v_total_models
  FROM models
  WHERE is_approved = true
    AND profile_photo_url IS NOT NULL;

  -- Try to find existing session
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO v_session FROM top_model_sessions WHERE user_id = p_user_id;
  ELSIF p_fingerprint IS NOT NULL THEN
    SELECT * INTO v_session FROM top_model_sessions WHERE fingerprint = p_fingerprint;
  END IF;

  -- Create new session if not exists
  IF v_session.id IS NULL THEN
    INSERT INTO top_model_sessions (user_id, fingerprint, models_swiped, created_at)
    VALUES (p_user_id, p_fingerprint, '{}', NOW())
    RETURNING * INTO v_session;
  END IF;

  -- Check if 24-hour cooldown has passed
  IF v_session.completed_at IS NOT NULL AND
     v_session.completed_at > NOW() - INTERVAL '24 hours' THEN
    RETURN jsonb_build_object(
      'session_id', v_session.id,
      'can_swipe', false,
      'models_swiped', array_length(v_session.models_swiped, 1),
      'total_models', v_total_models,
      'next_reset_at', v_session.completed_at + INTERVAL '24 hours'
    );
  END IF;

  -- Reset if cooldown passed
  IF v_session.completed_at IS NOT NULL AND
     v_session.completed_at <= NOW() - INTERVAL '24 hours' THEN
    UPDATE top_model_sessions
    SET models_swiped = '{}', completed_at = NULL
    WHERE id = v_session.id
    RETURNING * INTO v_session;
  END IF;

  RETURN jsonb_build_object(
    'session_id', v_session.id,
    'can_swipe', true,
    'models_swiped', COALESCE(array_length(v_session.models_swiped, 1), 0),
    'total_models', v_total_models,
    'next_reset_at', NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark model as swiped in session
CREATE OR REPLACE FUNCTION mark_model_swiped(
  p_session_id UUID,
  p_model_id UUID,
  p_total_models INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_session top_model_sessions%ROWTYPE;
  v_new_count INTEGER;
BEGIN
  -- Update session with new swiped model
  UPDATE top_model_sessions
  SET models_swiped = array_append(models_swiped, p_model_id)
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  v_new_count := COALESCE(array_length(v_session.models_swiped, 1), 0);

  -- Mark as completed if all models swiped
  IF v_new_count >= p_total_models THEN
    UPDATE top_model_sessions
    SET completed_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
      'completed', true,
      'models_swiped', v_new_count
    );
  END IF;

  RETURN jsonb_build_object(
    'completed', false,
    'models_swiped', v_new_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Daily reset function (run via cron at midnight)
CREATE OR REPLACE FUNCTION reset_daily_top_model_leaderboard() RETURNS void AS $$
BEGIN
  UPDATE top_model_leaderboard SET today_points = 0;
END;
$$ LANGUAGE plpgsql;

-- Weekly reset function (run via cron on Sunday midnight)
CREATE OR REPLACE FUNCTION reset_weekly_top_model_leaderboard() RETURNS void AS $$
BEGIN
  UPDATE top_model_leaderboard SET week_points = 0;
END;
$$ LANGUAGE plpgsql;
