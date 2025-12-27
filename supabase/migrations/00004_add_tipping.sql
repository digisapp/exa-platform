-- ============================================
-- EXA PLATFORM - ADD TIPPING SUPPORT
-- ============================================

-- Function to transfer coins (tip) from one actor to another
CREATE OR REPLACE FUNCTION public.transfer_coins(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_amount int,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS jsonb AS $$
DECLARE
  sender_type text;
  recipient_type text;
  sender_balance int;
BEGIN
  -- Validate amount
  IF p_amount < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be at least 1');
  END IF;

  -- Get actor types
  SELECT type INTO sender_type FROM public.actors WHERE id = p_sender_id;
  SELECT type INTO recipient_type FROM public.actors WHERE id = p_recipient_id;

  IF sender_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender not found');
  END IF;

  IF recipient_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  -- Get sender balance based on type
  IF sender_type = 'fan' THEN
    SELECT coin_balance INTO sender_balance
    FROM public.fans
    WHERE id = p_sender_id
    FOR UPDATE;
  ELSE
    SELECT coin_balance INTO sender_balance
    FROM public.models
    WHERE id = p_sender_id
    FOR UPDATE;
  END IF;

  -- Check balance
  IF sender_balance IS NULL OR sender_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient coins',
      'balance', COALESCE(sender_balance, 0),
      'required', p_amount
    );
  END IF;

  -- Deduct from sender
  IF sender_type = 'fan' THEN
    UPDATE public.fans
    SET coin_balance = coin_balance - p_amount,
        updated_at = now()
    WHERE id = p_sender_id;
  ELSE
    UPDATE public.models
    SET coin_balance = coin_balance - p_amount
    WHERE id = p_sender_id;
  END IF;

  -- Credit to recipient (models only for now)
  IF recipient_type = 'model' THEN
    UPDATE public.models
    SET coin_balance = coin_balance + p_amount
    WHERE id = p_recipient_id;
  ELSIF recipient_type = 'fan' THEN
    UPDATE public.fans
    SET coin_balance = coin_balance + p_amount,
        updated_at = now()
    WHERE id = p_recipient_id;
  END IF;

  -- Record sender transaction (negative)
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_sender_id, -p_amount, 'tip_sent', p_metadata || jsonb_build_object('recipient_id', p_recipient_id));

  -- Record recipient transaction (positive)
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_recipient_id, p_amount, 'tip_received', p_metadata || jsonb_build_object('sender_id', p_sender_id));

  -- Return success with new balances
  RETURN jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'sender_new_balance', sender_balance - p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for earnings queries
CREATE INDEX IF NOT EXISTS idx_coin_transactions_action ON public.coin_transactions(action);
