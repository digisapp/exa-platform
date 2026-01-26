-- ============================================
-- FIX: send_message_with_coins to support brands
-- ============================================
-- The original function only handled 'fan' and 'model' types.
-- Brands also have coin_balance and need to send messages with coins.

CREATE OR REPLACE FUNCTION public.send_message_with_coins(
  p_conversation_id uuid,
  p_sender_id uuid,
  p_recipient_id uuid,
  p_content text,
  p_media_url text DEFAULT NULL,
  p_media_type text DEFAULT NULL,
  p_coin_amount int DEFAULT 0
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

  -- Insert message
  INSERT INTO public.messages (conversation_id, sender_id, content, media_url, media_type, is_system)
  VALUES (p_conversation_id, p_sender_id, p_content, p_media_url, p_media_type, false)
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

-- Also fix hold_coins_for_booking to support brands
CREATE OR REPLACE FUNCTION public.hold_coins_for_booking(
  p_actor_id uuid,
  p_booking_id uuid,
  p_amount int
)
RETURNS jsonb AS $$
DECLARE
  actor_type text;
  current_balance int;
  escrow_id uuid;
BEGIN
  -- Validate amount
  IF p_amount < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be at least 1');
  END IF;

  -- Get actor type
  SELECT type INTO actor_type FROM public.actors WHERE id = p_actor_id;

  IF actor_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Actor not found');
  END IF;

  -- Get balance with lock based on type
  IF actor_type = 'fan' THEN
    SELECT coin_balance INTO current_balance
    FROM public.fans WHERE id = p_actor_id FOR UPDATE;
  ELSIF actor_type = 'brand' THEN
    SELECT coin_balance INTO current_balance
    FROM public.brands WHERE id = p_actor_id FOR UPDATE;
  ELSE
    SELECT coin_balance INTO current_balance
    FROM public.models WHERE id = p_actor_id FOR UPDATE;
  END IF;

  -- Check balance
  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient coins',
      'balance', COALESCE(current_balance, 0),
      'required', p_amount
    );
  END IF;

  -- Deduct from balance based on type
  IF actor_type = 'fan' THEN
    UPDATE public.fans
    SET coin_balance = coin_balance - p_amount, updated_at = now()
    WHERE id = p_actor_id;
  ELSIF actor_type = 'brand' THEN
    UPDATE public.brands
    SET coin_balance = coin_balance - p_amount, updated_at = now()
    WHERE id = p_actor_id;
  ELSE
    UPDATE public.models
    SET coin_balance = coin_balance - p_amount
    WHERE id = p_actor_id;
  END IF;

  -- Create escrow record
  INSERT INTO public.coin_escrows (actor_id, booking_id, amount, status, metadata)
  VALUES (p_actor_id, p_booking_id, p_amount, 'held',
          jsonb_build_object('held_at', now()))
  RETURNING id INTO escrow_id;

  -- Record transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_actor_id, -p_amount, 'booking_escrow_held',
          jsonb_build_object('booking_id', p_booking_id, 'escrow_id', escrow_id));

  RETURN jsonb_build_object(
    'success', true,
    'escrow_id', escrow_id,
    'amount', p_amount,
    'new_balance', current_balance - p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix refund_escrow to support brands
CREATE OR REPLACE FUNCTION public.refund_escrow(
  p_escrow_id uuid
)
RETURNS jsonb AS $$
DECLARE
  escrow_record record;
  actor_type text;
BEGIN
  -- Get and lock escrow
  SELECT * INTO escrow_record
  FROM public.coin_escrows
  WHERE id = p_escrow_id AND status = 'held'
  FOR UPDATE;

  IF escrow_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Escrow not found or already processed');
  END IF;

  -- Get actor type
  SELECT type INTO actor_type FROM public.actors WHERE id = escrow_record.actor_id;

  -- Update escrow status
  UPDATE public.coin_escrows
  SET status = 'refunded', released_at = now()
  WHERE id = p_escrow_id;

  -- Refund to original actor based on type
  IF actor_type = 'fan' THEN
    UPDATE public.fans
    SET coin_balance = coin_balance + escrow_record.amount, updated_at = now()
    WHERE id = escrow_record.actor_id;
  ELSIF actor_type = 'brand' THEN
    UPDATE public.brands
    SET coin_balance = coin_balance + escrow_record.amount, updated_at = now()
    WHERE id = escrow_record.actor_id;
  ELSE
    UPDATE public.models
    SET coin_balance = coin_balance + escrow_record.amount
    WHERE id = escrow_record.actor_id;
  END IF;

  -- Record transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (escrow_record.actor_id, escrow_record.amount, 'booking_escrow_refunded',
          jsonb_build_object('booking_id', escrow_record.booking_id, 'escrow_id', p_escrow_id));

  RETURN jsonb_build_object(
    'success', true,
    'amount', escrow_record.amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
