-- Fix send_message_with_coins: guard recipient coin_transaction INSERT against null p_recipient_id
-- Also add DEFAULT NULL to p_recipient_id so it can be omitted safely

CREATE OR REPLACE FUNCTION public.send_message_with_coins(
  p_conversation_id uuid,
  p_sender_id uuid,
  p_recipient_id uuid DEFAULT NULL,
  p_content text DEFAULT '',
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
      -- Model or other types
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

    -- Credit to recipient (model) - only if recipient exists
    IF p_recipient_id IS NOT NULL THEN
      UPDATE public.models
      SET coin_balance = coin_balance + p_coin_amount
      WHERE id = p_recipient_id;
    END IF;

    -- Record sender transaction
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
    VALUES (p_sender_id, -p_coin_amount, 'message_sent',
            jsonb_build_object('conversation_id', p_conversation_id, 'recipient_id', p_recipient_id));

    -- Record recipient transaction only if recipient is known
    IF p_recipient_id IS NOT NULL THEN
      INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
      VALUES (p_recipient_id, p_coin_amount, 'message_received',
              jsonb_build_object('conversation_id', p_conversation_id, 'sender_id', p_sender_id));
    END IF;
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
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
