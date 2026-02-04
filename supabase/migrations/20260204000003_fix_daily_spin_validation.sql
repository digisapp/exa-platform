-- =============================================
-- FIX DAILY SPIN TO REQUIRE GAME COMPLETION
-- =============================================

-- Update claim_daily_spin to require game completion before spinning
-- Also returns the new coin balance
CREATE OR REPLACE FUNCTION claim_daily_spin(
  p_user_id UUID,
  p_coins INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_session top_model_sessions%ROWTYPE;
  v_today DATE := CURRENT_DATE;
  v_actor_id UUID;
  v_actor_type TEXT;
  v_new_balance INTEGER;
BEGIN
  -- Get user's session
  SELECT * INTO v_session FROM top_model_sessions WHERE user_id = p_user_id;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;

  -- Check if game is completed (must have completed_at set)
  IF v_session.completed_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must complete the game first');
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

  -- Add coins based on actor type and get new balance
  IF v_actor_type = 'fan' THEN
    UPDATE fans SET coin_balance = coin_balance + p_coins WHERE user_id = p_user_id
    RETURNING coin_balance INTO v_new_balance;
  ELSIF v_actor_type = 'model' THEN
    UPDATE models SET coin_balance = coin_balance + p_coins WHERE user_id = p_user_id
    RETURNING coin_balance INTO v_new_balance;
  ELSIF v_actor_type = 'brand' THEN
    UPDATE brands SET coin_balance = coin_balance + p_coins WHERE user_id = p_user_id
    RETURNING coin_balance INTO v_new_balance;
  END IF;

  -- Record transaction
  INSERT INTO coin_transactions (actor_id, amount, action, metadata)
  VALUES (v_actor_id, p_coins, 'daily_spin', jsonb_build_object('source', 'exa_boost'));

  RETURN jsonb_build_object(
    'success', true,
    'coins_awarded', p_coins,
    'total_spin_coins', COALESCE(v_session.total_spin_coins, 0) + p_coins,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
