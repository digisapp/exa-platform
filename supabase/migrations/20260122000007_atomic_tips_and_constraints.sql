-- ============================================
-- ATOMIC TIP TRANSFER FUNCTION
-- ============================================
-- This function ensures tip transfer happens atomically with row locking
-- Prevents race conditions where users could over-spend their balance

CREATE OR REPLACE FUNCTION public.send_tip(
  p_sender_id uuid,
  p_recipient_model_id uuid,
  p_amount int
)
RETURNS jsonb AS $$
DECLARE
  sender_type text;
  sender_balance int;
  recipient_balance int;
  recipient_actor_id uuid;
BEGIN
  -- Validate amount
  IF p_amount < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tip amount must be at least 1 coin');
  END IF;

  -- Prevent tipping yourself
  IF p_sender_id = p_recipient_model_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot tip yourself');
  END IF;

  -- Get sender type
  SELECT type INTO sender_type FROM public.actors WHERE id = p_sender_id;

  IF sender_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender not found');
  END IF;

  -- Get sender balance with row lock (prevents concurrent modifications)
  IF sender_type = 'fan' THEN
    SELECT coin_balance INTO sender_balance
    FROM public.fans
    WHERE id = p_sender_id
    FOR UPDATE;
  ELSIF sender_type = 'model' THEN
    SELECT coin_balance INTO sender_balance
    FROM public.models
    WHERE id = p_sender_id
    FOR UPDATE;
  ELSIF sender_type = 'brand' THEN
    SELECT coin_balance INTO sender_balance
    FROM public.brands
    WHERE id = p_sender_id
    FOR UPDATE;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid sender type');
  END IF;

  -- Check sender balance
  IF sender_balance IS NULL OR sender_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient coins',
      'balance', COALESCE(sender_balance, 0),
      'required', p_amount
    );
  END IF;

  -- Get recipient actor ID and lock recipient balance
  SELECT a.id INTO recipient_actor_id
  FROM public.actors a
  JOIN public.models m ON m.user_id = a.user_id
  WHERE m.id = p_recipient_model_id;

  SELECT coin_balance INTO recipient_balance
  FROM public.models
  WHERE id = p_recipient_model_id
  FOR UPDATE;

  IF recipient_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  -- Deduct from sender
  IF sender_type = 'fan' THEN
    UPDATE public.fans
    SET coin_balance = coin_balance - p_amount, updated_at = now()
    WHERE id = p_sender_id;
  ELSIF sender_type = 'model' THEN
    UPDATE public.models
    SET coin_balance = coin_balance - p_amount
    WHERE id = p_sender_id;
  ELSIF sender_type = 'brand' THEN
    UPDATE public.brands
    SET coin_balance = coin_balance - p_amount
    WHERE id = p_sender_id;
  END IF;

  -- Credit recipient model
  UPDATE public.models
  SET coin_balance = coin_balance + p_amount
  WHERE id = p_recipient_model_id;

  -- Record sender transaction (debit)
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (
    p_sender_id,
    -p_amount,
    'tip_sent',
    jsonb_build_object('recipient_model_id', p_recipient_model_id)
  );

  -- Record recipient transaction (credit)
  IF recipient_actor_id IS NOT NULL THEN
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
    VALUES (
      recipient_actor_id,
      p_amount,
      'tip_received',
      jsonb_build_object('sender_actor_id', p_sender_id)
    );
  END IF;

  -- Return success with new balances
  RETURN jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'sender_new_balance', sender_balance - p_amount,
    'recipient_new_balance', recipient_balance + p_amount
  );

EXCEPTION WHEN OTHERS THEN
  -- Any error rolls back the entire transaction
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADD CHECK CONSTRAINT FOR COIN BALANCE
-- ============================================
-- Ensures coin_balance cannot go negative

-- Add CHECK constraint to models table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'models_coin_balance_non_negative'
  ) THEN
    ALTER TABLE public.models
    ADD CONSTRAINT models_coin_balance_non_negative CHECK (coin_balance >= 0);
  END IF;
END $$;

-- Add CHECK constraint to brands table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'brands_coin_balance_non_negative'
  ) THEN
    ALTER TABLE public.brands
    ADD CONSTRAINT brands_coin_balance_non_negative CHECK (coin_balance >= 0);
  END IF;
END $$;

-- Note: fans table already has CHECK (coin_balance >= 0) from initial migration
