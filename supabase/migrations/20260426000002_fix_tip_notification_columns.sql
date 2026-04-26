-- Fix tip_live_wall_message: notification INSERT used wrong column names.
-- Actual notifications schema: user_id (not actor_id), message (not body), metadata (not data), read_at (nullable ts).

CREATE OR REPLACE FUNCTION public.tip_live_wall_message(
  p_tipper_actor_id UUID,
  p_message_id UUID,
  p_amount INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message RECORD;
  v_tipper RECORD;
  v_recipient RECORD;
  v_tipper_balance INT;
  v_tipper_display TEXT;
  v_recipient_display TEXT;
  v_old_tip_total INT;
  v_new_tip_total INT;
  v_recipient_user_id UUID;
BEGIN
  IF p_amount < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum tip is 1 coin');
  END IF;

  SELECT id, actor_id, display_name, is_deleted
  INTO v_message FROM live_wall_messages WHERE id = p_message_id;

  IF NOT FOUND OR v_message.is_deleted THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message not found');
  END IF;

  IF v_message.actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot tip system messages');
  END IF;

  IF v_message.actor_id = p_tipper_actor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot tip your own message');
  END IF;

  SELECT id, type, user_id INTO v_tipper FROM actors WHERE id = p_tipper_actor_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tipper not found');
  END IF;

  SELECT id, type, user_id INTO v_recipient FROM actors WHERE id = v_message.actor_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  v_recipient_user_id := v_recipient.user_id;

  IF v_tipper.type = 'model' THEN
    SELECT coin_balance INTO v_tipper_balance FROM models WHERE user_id = v_tipper.user_id FOR UPDATE;
    SELECT '@' || COALESCE(username, 'someone') INTO v_tipper_display FROM models WHERE user_id = v_tipper.user_id;
  ELSIF v_tipper.type = 'fan' THEN
    SELECT coin_balance INTO v_tipper_balance FROM fans WHERE user_id = v_tipper.user_id FOR UPDATE;
    SELECT '@' || COALESCE(username, 'someone') INTO v_tipper_display FROM fans WHERE user_id = v_tipper.user_id;
  ELSIF v_tipper.type = 'brand' THEN
    SELECT coin_balance INTO v_tipper_balance FROM brands WHERE user_id = v_tipper.user_id FOR UPDATE;
    SELECT COALESCE(company_name, 'someone') INTO v_tipper_display FROM brands WHERE user_id = v_tipper.user_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid tipper type');
  END IF;

  IF v_tipper_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient coins', 'balance', v_tipper_balance, 'required', p_amount);
  END IF;

  IF v_tipper.type = 'model' THEN
    UPDATE models SET coin_balance = coin_balance - p_amount WHERE user_id = v_tipper.user_id;
  ELSIF v_tipper.type = 'fan' THEN
    UPDATE fans SET coin_balance = coin_balance - p_amount WHERE user_id = v_tipper.user_id;
  ELSIF v_tipper.type = 'brand' THEN
    UPDATE brands SET coin_balance = coin_balance - p_amount WHERE user_id = v_tipper.user_id;
  END IF;

  IF v_recipient.type = 'model' THEN
    PERFORM 1 FROM models WHERE user_id = v_recipient.user_id FOR UPDATE;
    UPDATE models SET coin_balance = coin_balance + p_amount WHERE user_id = v_recipient.user_id;
    SELECT '@' || COALESCE(username, 'someone') INTO v_recipient_display FROM models WHERE user_id = v_recipient.user_id;
  ELSIF v_recipient.type = 'fan' THEN
    PERFORM 1 FROM fans WHERE user_id = v_recipient.user_id FOR UPDATE;
    UPDATE fans SET coin_balance = coin_balance + p_amount WHERE user_id = v_recipient.user_id;
    SELECT '@' || COALESCE(username, 'someone') INTO v_recipient_display FROM fans WHERE user_id = v_recipient.user_id;
  ELSIF v_recipient.type = 'brand' THEN
    PERFORM 1 FROM brands WHERE user_id = v_recipient.user_id FOR UPDATE;
    UPDATE brands SET coin_balance = coin_balance + p_amount WHERE user_id = v_recipient.user_id;
    SELECT COALESCE(company_name, 'someone') INTO v_recipient_display FROM brands WHERE user_id = v_recipient.user_id;
  END IF;

  INSERT INTO coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_tipper_actor_id, -p_amount, 'live_wall_tip_sent',
    jsonb_build_object('message_id', p_message_id, 'recipient_actor_id', v_message.actor_id));

  INSERT INTO coin_transactions (actor_id, amount, action, metadata)
  VALUES (v_message.actor_id, p_amount, 'live_wall_tip_received',
    jsonb_build_object('message_id', p_message_id, 'tipper_actor_id', p_tipper_actor_id));

  INSERT INTO live_wall_tips (message_id, tipper_actor_id, recipient_actor_id, amount)
  VALUES (p_message_id, p_tipper_actor_id, v_message.actor_id, p_amount);

  SELECT tip_total INTO v_old_tip_total FROM live_wall_messages WHERE id = p_message_id;
  UPDATE live_wall_messages SET tip_total = tip_total + p_amount WHERE id = p_message_id;
  v_new_tip_total := v_old_tip_total + p_amount;

  IF p_amount >= 100 THEN
    INSERT INTO live_wall_messages (actor_type, display_name, content, message_type)
    VALUES ('system', 'EXA', v_tipper_display || ' tipped ' || v_recipient_display || ' ' || p_amount || ' coins!', 'system');
  END IF;

  IF v_old_tip_total < 10 AND v_new_tip_total >= 10 THEN
    INSERT INTO live_wall_messages (actor_type, display_name, content, message_type)
    VALUES ('system', 'EXA', v_recipient_display || '''s message is heating up! 🔥 ' || v_new_tip_total || ' coins received', 'system');
  ELSIF v_old_tip_total < 50 AND v_new_tip_total >= 50 THEN
    INSERT INTO live_wall_messages (actor_type, display_name, content, message_type)
    VALUES ('system', 'EXA', v_recipient_display || '''s message is on fire! 🔥🔥 ' || v_new_tip_total || ' coins received', 'system');
  ELSIF v_old_tip_total < 100 AND v_new_tip_total >= 100 THEN
    INSERT INTO live_wall_messages (actor_type, display_name, content, message_type)
    VALUES ('system', 'EXA', v_recipient_display || '''s message is legendary! 👑 ' || v_new_tip_total || ' coins received', 'system');
  END IF;

  -- Notify recipient on super tips (>= 50 coins) using correct column names
  IF p_amount >= 50 AND v_recipient_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      v_recipient_user_id,
      'tip_received',
      '💰 Super Tip received!',
      v_tipper_display || ' sent you ' || p_amount || ' coins on the Live Wall',
      jsonb_build_object(
        'amount', p_amount,
        'tipper_actor_id', p_tipper_actor_id,
        'message_id', p_message_id
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'new_balance', v_tipper_balance - p_amount,
    'tip_total', v_new_tip_total
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
