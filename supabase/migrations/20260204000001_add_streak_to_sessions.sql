-- =============================================
-- ADD STREAK TRACKING TO TOP MODEL SESSIONS
-- =============================================

-- Add streak fields to top_model_sessions
ALTER TABLE top_model_sessions
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_play_date DATE;

-- Update the get_or_create_top_model_session function to include streak
-- Also preserves session merging logic from migration 20260201000007
CREATE OR REPLACE FUNCTION get_or_create_top_model_session(
  p_user_id UUID,
  p_fingerprint TEXT
) RETURNS JSONB AS $$
DECLARE
  v_session top_model_sessions%ROWTYPE;
  v_anon_session top_model_sessions%ROWTYPE;
  v_total_models INTEGER;
BEGIN
  -- Get total swipeable models count
  SELECT COUNT(*) INTO v_total_models
  FROM models
  WHERE is_approved = true
    AND profile_photo_url IS NOT NULL;

  -- Try to find existing session by user_id first
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO v_session FROM top_model_sessions WHERE user_id = p_user_id;

    -- If logged in user has no session, check if there's an anonymous session with their fingerprint
    IF v_session.id IS NULL AND p_fingerprint IS NOT NULL THEN
      SELECT * INTO v_anon_session FROM top_model_sessions WHERE fingerprint = p_fingerprint AND user_id IS NULL;

      -- If found anonymous session, convert it to user session
      IF v_anon_session.id IS NOT NULL THEN
        UPDATE top_model_sessions
        SET user_id = p_user_id
        WHERE id = v_anon_session.id
        RETURNING * INTO v_session;
      END IF;
    END IF;
  ELSIF p_fingerprint IS NOT NULL THEN
    -- Anonymous user - look up by fingerprint
    SELECT * INTO v_session FROM top_model_sessions WHERE fingerprint = p_fingerprint AND user_id IS NULL;
  END IF;

  -- Create new session if not exists
  IF v_session.id IS NULL THEN
    INSERT INTO top_model_sessions (user_id, fingerprint, models_swiped, created_at, current_streak, longest_streak)
    VALUES (p_user_id, p_fingerprint, '{}', NOW(), 0, 0)
    RETURNING * INTO v_session;
  END IF;

  -- Check if 24-hour cooldown has passed
  IF v_session.completed_at IS NOT NULL AND
     v_session.completed_at > NOW() - INTERVAL '24 hours' THEN
    RETURN jsonb_build_object(
      'session_id', v_session.id,
      'can_swipe', false,
      'models_swiped', COALESCE(array_length(v_session.models_swiped, 1), 0),
      'total_models', v_total_models,
      'next_reset_at', v_session.completed_at + INTERVAL '24 hours',
      'current_streak', COALESCE(v_session.current_streak, 0),
      'longest_streak', COALESCE(v_session.longest_streak, 0),
      'last_play_date', v_session.last_play_date
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
    'next_reset_at', NULL,
    'current_streak', COALESCE(v_session.current_streak, 0),
    'longest_streak', COALESCE(v_session.longest_streak, 0),
    'last_play_date', v_session.last_play_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update streak when session completes
CREATE OR REPLACE FUNCTION update_session_streak(
  p_session_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_session top_model_sessions%ROWTYPE;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - 1;
  v_new_streak INTEGER;
  v_new_longest INTEGER;
BEGIN
  SELECT * INTO v_session FROM top_model_sessions WHERE id = p_session_id;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;

  -- Calculate new streak
  IF v_session.last_play_date = v_yesterday THEN
    -- Consecutive day - increment streak
    v_new_streak := COALESCE(v_session.current_streak, 0) + 1;
  ELSIF v_session.last_play_date = v_today THEN
    -- Already played today - keep current streak
    v_new_streak := COALESCE(v_session.current_streak, 1);
  ELSE
    -- Streak broken or first time - start at 1
    v_new_streak := 1;
  END IF;

  -- Update longest streak if needed
  v_new_longest := GREATEST(COALESCE(v_session.longest_streak, 0), v_new_streak);

  -- Update the session
  UPDATE top_model_sessions
  SET
    current_streak = v_new_streak,
    longest_streak = v_new_longest,
    last_play_date = v_today
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'current_streak', v_new_streak,
    'longest_streak', v_new_longest
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
