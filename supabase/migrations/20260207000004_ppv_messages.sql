-- ============================================
-- PPV (PAY-PER-VIEW) MESSAGES
-- ============================================
-- Models can set a coin price on media messages.
-- Recipients see the media blurred and must pay to unlock.
-- Coins transfer atomically from buyer to model.

-- 1. Update send_message_with_coins to accept media_price
CREATE OR REPLACE FUNCTION public.send_message_with_coins(
  p_conversation_id uuid,
  p_sender_id uuid,
  p_recipient_id uuid,
  p_content text,
  p_media_url text DEFAULT NULL,
  p_media_type text DEFAULT NULL,
  p_coin_amount int DEFAULT 0,
  p_media_price int DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  sender_type text;
  sender_balance int;
  new_message_id uuid;
BEGIN
  -- Get sender type
  SELECT type INTO sender_type FROM public.actors WHERE id = p_sender_id;

  IF sender_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender not found');
  END IF;

  -- Handle coin transfer if required
  IF p_coin_amount > 0 THEN
    -- Get sender balance based on type (with row lock)
    IF sender_type = 'fan' THEN
      SELECT coin_balance INTO sender_balance
      FROM public.fans
      WHERE id = p_sender_id
      FOR UPDATE;
    ELSIF sender_type = 'brand' THEN
      SELECT coin_balance INTO sender_balance
      FROM public.brands
      WHERE id = p_sender_id
      FOR UPDATE;
    ELSE
      -- Model or admin
      SELECT coin_balance INTO sender_balance
      FROM public.models
      WHERE id = p_sender_id
      FOR UPDATE;
    END IF;

    -- Check balance
    IF sender_balance IS NULL OR sender_balance < p_coin_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Insufficient coins',
        'balance', COALESCE(sender_balance, 0),
        'required', p_coin_amount
      );
    END IF;

    -- Deduct from sender based on type
    IF sender_type = 'fan' THEN
      UPDATE public.fans
      SET coin_balance = coin_balance - p_coin_amount,
          updated_at = now()
      WHERE id = p_sender_id;
    ELSIF sender_type = 'brand' THEN
      UPDATE public.brands
      SET coin_balance = coin_balance - p_coin_amount,
          updated_at = now()
      WHERE id = p_sender_id;
    ELSE
      UPDATE public.models
      SET coin_balance = coin_balance - p_coin_amount
      WHERE id = p_sender_id;
    END IF;

    -- Credit to recipient (model)
    UPDATE public.models
    SET coin_balance = coin_balance + p_coin_amount
    WHERE id = p_recipient_id;

    -- Record sender transaction
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
    VALUES (p_sender_id, -p_coin_amount, 'message_sent',
            jsonb_build_object('conversation_id', p_conversation_id, 'recipient_id', p_recipient_id));

    -- Record recipient transaction
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
    VALUES (p_recipient_id, p_coin_amount, 'message_received',
            jsonb_build_object('conversation_id', p_conversation_id, 'sender_id', p_sender_id));
  END IF;

  -- Insert message (include media_price if set)
  INSERT INTO public.messages (conversation_id, sender_id, content, media_url, media_type, is_system, media_price)
  VALUES (p_conversation_id, p_sender_id, p_content, p_media_url, p_media_type, false, p_media_price)
  RETURNING id INTO new_message_id;

  -- Update conversation timestamp
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = p_conversation_id;

  -- Update sender's last_read_at
  UPDATE public.conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND actor_id = p_sender_id;

  -- Return success with message details
  RETURN jsonb_build_object(
    'success', true,
    'message_id', new_message_id,
    'coins_deducted', p_coin_amount,
    'sender_new_balance', CASE WHEN p_coin_amount > 0 THEN sender_balance - p_coin_amount ELSE NULL END
  );

EXCEPTION WHEN OTHERS THEN
  -- Any error rolls back the entire transaction
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create unlock_message_media RPC
CREATE OR REPLACE FUNCTION public.unlock_message_media(
  p_buyer_id uuid,
  p_message_id uuid
)
RETURNS jsonb AS $$
DECLARE
  buyer_type text;
  buyer_balance int;
  msg_record RECORD;
  sender_actor RECORD;
  sender_model_id uuid;
  conversation_id_var uuid;
BEGIN
  -- Get message details (include conversation_id for auth check)
  SELECT m.id, m.sender_id, m.conversation_id, m.media_url, m.media_price, m.media_viewed_by
  INTO msg_record
  FROM public.messages m
  WHERE m.id = p_message_id;

  IF msg_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message not found');
  END IF;

  -- Check message has a price
  IF msg_record.media_price IS NULL OR msg_record.media_price <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message is not pay-per-view');
  END IF;

  -- Verify buyer is a participant in the conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = msg_record.conversation_id
    AND actor_id = p_buyer_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant in this conversation');
  END IF;

  -- Buyer cannot be the sender
  IF msg_record.sender_id = p_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot unlock your own message');
  END IF;

  -- Check if already unlocked (idempotent)
  IF msg_record.media_viewed_by IS NOT NULL AND p_buyer_id = ANY(msg_record.media_viewed_by) THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_unlocked', true,
      'media_url', msg_record.media_url
    );
  END IF;

  -- Get sender's actor info to find model ID for coin credit
  SELECT a.id, a.type, a.user_id INTO sender_actor
  FROM public.actors a
  WHERE a.id = msg_record.sender_id;

  IF sender_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender not found');
  END IF;

  -- Get the model's table ID (models table) using user_id
  SELECT id INTO sender_model_id
  FROM public.models
  WHERE user_id = sender_actor.user_id;

  IF sender_model_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender model not found');
  END IF;

  -- Get buyer info
  SELECT type INTO buyer_type FROM public.actors WHERE id = p_buyer_id;

  IF buyer_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Buyer not found');
  END IF;

  -- Get buyer balance with row lock
  IF buyer_type = 'fan' THEN
    SELECT coin_balance INTO buyer_balance
    FROM public.fans WHERE id = p_buyer_id FOR UPDATE;
  ELSIF buyer_type = 'brand' THEN
    SELECT coin_balance INTO buyer_balance
    FROM public.brands WHERE id = p_buyer_id FOR UPDATE;
  ELSE
    SELECT coin_balance INTO buyer_balance
    FROM public.models WHERE id = p_buyer_id FOR UPDATE;
  END IF;

  -- Check balance
  IF buyer_balance IS NULL OR buyer_balance < msg_record.media_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient coins',
      'balance', COALESCE(buyer_balance, 0),
      'required', msg_record.media_price
    );
  END IF;

  -- Deduct from buyer
  IF buyer_type = 'fan' THEN
    UPDATE public.fans
    SET coin_balance = coin_balance - msg_record.media_price, updated_at = now()
    WHERE id = p_buyer_id;
  ELSIF buyer_type = 'brand' THEN
    UPDATE public.brands
    SET coin_balance = coin_balance - msg_record.media_price, updated_at = now()
    WHERE id = p_buyer_id;
  ELSE
    UPDATE public.models
    SET coin_balance = coin_balance - msg_record.media_price
    WHERE id = p_buyer_id;
  END IF;

  -- Credit to model
  UPDATE public.models
  SET coin_balance = coin_balance + msg_record.media_price
  WHERE id = sender_model_id;

  -- Append buyer to media_viewed_by
  UPDATE public.messages
  SET media_viewed_by = COALESCE(media_viewed_by, ARRAY[]::uuid[]) || ARRAY[p_buyer_id]
  WHERE id = p_message_id;

  -- Record buyer debit transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_buyer_id, -msg_record.media_price, 'ppv_unlock',
          jsonb_build_object('message_id', p_message_id, 'model_id', sender_model_id));

  -- Record model credit transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (sender_model_id, msg_record.media_price, 'ppv_sale',
          jsonb_build_object('message_id', p_message_id, 'buyer_id', p_buyer_id));

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'media_url', msg_record.media_url,
    'amount_paid', msg_record.media_price,
    'new_balance', buyer_balance - msg_record.media_price
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
