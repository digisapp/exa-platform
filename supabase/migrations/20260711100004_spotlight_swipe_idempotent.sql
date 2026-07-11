-- Make mark_model_swiped idempotent
--
-- The original (20260201000005) appends the model ID to models_swiped
-- unconditionally and derives the swipe count from array_length. Concurrent
-- or retried duplicate votes for the same model therefore inflate the count,
-- which can push it past p_total_models and complete a cycle prematurely.
--
-- Fix: only append when the ID isn't already in the array. On a duplicate,
-- re-read the row so the response still reports the real count. Same
-- signature, return shape, and SECURITY DEFINER as the original.

CREATE OR REPLACE FUNCTION mark_model_swiped(
  p_session_id UUID,
  p_model_id UUID,
  p_total_models INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_session top_model_sessions%ROWTYPE;
  v_new_count INTEGER;
BEGIN
  -- Update session with new swiped model, skipping duplicates. The row lock
  -- serializes concurrent calls, so the containment check sees prior appends.
  UPDATE top_model_sessions
  SET models_swiped = array_append(models_swiped, p_model_id)
  WHERE id = p_session_id
    AND NOT (COALESCE(models_swiped, '{}') @> ARRAY[p_model_id])
  RETURNING * INTO v_session;

  -- Duplicate swipe (or unknown session): read the current row instead
  IF v_session.id IS NULL THEN
    SELECT * INTO v_session FROM top_model_sessions WHERE id = p_session_id;

    IF v_session.id IS NULL THEN
      RETURN jsonb_build_object(
        'completed', false,
        'models_swiped', 0
      );
    END IF;
  END IF;

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
