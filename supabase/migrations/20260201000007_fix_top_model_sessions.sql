-- Fix duplicate sessions and add unique constraints

-- First, clean up duplicate fingerprint sessions (keep the one with most progress)
DELETE FROM top_model_sessions a
USING top_model_sessions b
WHERE a.fingerprint = b.fingerprint
  AND a.fingerprint IS NOT NULL
  AND a.user_id IS NULL
  AND b.user_id IS NOT NULL;

-- Also clean up any duplicate user_id sessions (keep the one with most progress)
DELETE FROM top_model_sessions a
USING top_model_sessions b
WHERE a.user_id = b.user_id
  AND a.user_id IS NOT NULL
  AND a.id != b.id
  AND COALESCE(array_length(a.models_swiped, 1), 0) < COALESCE(array_length(b.models_swiped, 1), 0);

-- Add unique constraints to prevent future duplicates
-- First drop if exists (in case migration is re-run)
DROP INDEX IF EXISTS idx_top_sessions_user_unique;
DROP INDEX IF EXISTS idx_top_sessions_fingerprint_unique;

-- Create unique partial indexes (allows multiple NULLs, but ensures uniqueness for non-null values)
CREATE UNIQUE INDEX idx_top_sessions_user_unique ON top_model_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_top_sessions_fingerprint_unique ON top_model_sessions(fingerprint) WHERE fingerprint IS NOT NULL AND user_id IS NULL;

-- Update the get_or_create function to merge sessions when user logs in
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
      'models_swiped', COALESCE(array_length(v_session.models_swiped, 1), 0),
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
