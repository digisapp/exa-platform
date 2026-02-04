-- =============================================
-- ADD DAILY SPIN TRACKING TO TOP MODEL SESSIONS
-- =============================================

-- Add daily spin fields to top_model_sessions
ALTER TABLE top_model_sessions
ADD COLUMN IF NOT EXISTS last_spin_date DATE,
ADD COLUMN IF NOT EXISTS total_spin_coins INTEGER DEFAULT 0;

-- Update the get_or_create_top_model_session function to include spin info
CREATE OR REPLACE FUNCTION get_or_create_top_model_session(
  p_user_id UUID,
  p_fingerprint TEXT
) RETURNS JSONB AS $$
DECLARE
  v_session top_model_sessions%ROWTYPE;
  v_anon_session top_model_sessions%ROWTYPE;
  v_total_models INTEGER;
  v_today DATE := CURRENT_DATE;
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
      'last_play_date', v_session.last_play_date,
      'has_spun_today', v_session.last_spin_date = v_today,
      'total_spin_coins', COALESCE(v_session.total_spin_coins, 0)
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
    'last_play_date', v_session.last_play_date,
    'has_spun_today', v_session.last_spin_date = v_today,
    'total_spin_coins', COALESCE(v_session.total_spin_coins, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim daily spin reward
CREATE OR REPLACE FUNCTION claim_daily_spin(
  p_user_id UUID,
  p_coins INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_session top_model_sessions%ROWTYPE;
  v_today DATE := CURRENT_DATE;
  v_actor_id UUID;
  v_actor_type TEXT;
BEGIN
  -- Get user's session
  SELECT * INTO v_session FROM top_model_sessions WHERE user_id = p_user_id;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;

  -- Check if already spun today
  IF v_session.last_spin_date = v_today THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already spun today');
  END IF;

  -- Get actor id and type
  SELECT id, type INTO v_actor_id, v_actor_type FROM actors WHERE user_id = p_user_id;

  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Actor not found');
  END IF;

  -- Update session spin tracking
  UPDATE top_model_sessions
  SET
    last_spin_date = v_today,
    total_spin_coins = COALESCE(total_spin_coins, 0) + p_coins
  WHERE id = v_session.id;

  -- Add coins based on actor type
  IF v_actor_type = 'fan' THEN
    UPDATE fans SET coin_balance = coin_balance + p_coins WHERE user_id = p_user_id;
  ELSIF v_actor_type = 'model' THEN
    UPDATE models SET coin_balance = coin_balance + p_coins WHERE user_id = p_user_id;
  ELSIF v_actor_type = 'brand' THEN
    UPDATE brands SET coin_balance = coin_balance + p_coins WHERE user_id = p_user_id;
  END IF;

  -- Record transaction
  INSERT INTO coin_transactions (actor_id, amount, action, metadata)
  VALUES (v_actor_id, p_coins, 'daily_spin', jsonb_build_object('source', 'exa_boost'));

  RETURN jsonb_build_object(
    'success', true,
    'coins_awarded', p_coins,
    'total_spin_coins', COALESCE(v_session.total_spin_coins, 0) + p_coins
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
