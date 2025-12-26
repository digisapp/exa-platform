-- ============================================
-- EXA PLATFORM - ADD COINS FOR MESSAGING
-- ============================================

-- Add coin balance to models table
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS coin_balance int DEFAULT 0;

-- ============================================
-- COIN TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  amount int NOT NULL,
  action text NOT NULL, -- 'message_sent', 'purchase', 'refund', 'bonus'
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own coin transactions
CREATE POLICY "Users can view own coin transactions" ON public.coin_transactions
  FOR SELECT USING (actor_id = (SELECT id FROM public.actors WHERE user_id = auth.uid()));

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_coin_transactions_actor ON public.coin_transactions(actor_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created ON public.coin_transactions(created_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to deduct coins (with transaction safety)
CREATE OR REPLACE FUNCTION public.deduct_coins(
  p_actor_id uuid,
  p_amount int,
  p_action text,
  p_message_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS boolean AS $$
DECLARE
  current_balance int;
BEGIN
  -- Lock the row for update
  SELECT coin_balance INTO current_balance
  FROM public.models
  WHERE id = p_actor_id
  FOR UPDATE;

  -- Check if model exists and has enough balance
  IF current_balance IS NULL THEN
    RETURN false;
  END IF;

  IF current_balance < p_amount THEN
    RETURN false;
  END IF;

  -- Deduct coins
  UPDATE public.models
  SET coin_balance = coin_balance - p_amount
  WHERE id = p_actor_id;

  -- Record transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, message_id, metadata)
  VALUES (p_actor_id, -p_amount, p_action, p_message_id, p_metadata);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add coins
CREATE OR REPLACE FUNCTION public.add_coins(
  p_actor_id uuid,
  p_amount int,
  p_action text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS boolean AS $$
BEGIN
  -- Add coins
  UPDATE public.models
  SET coin_balance = coin_balance + p_amount
  WHERE id = p_actor_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Record transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_actor_id, p_amount, p_action, p_metadata);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if message is model-to-model (free)
CREATE OR REPLACE FUNCTION public.is_model_to_model(
  p_sender_id uuid,
  p_recipient_id uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.actors WHERE id = p_sender_id AND type = 'model'
  ) AND EXISTS (
    SELECT 1 FROM public.actors WHERE id = p_recipient_id AND type = 'model'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get message cost (0 for model-to-model, 10 otherwise)
CREATE OR REPLACE FUNCTION public.get_message_cost(
  p_sender_id uuid,
  p_recipient_id uuid
)
RETURNS int AS $$
BEGIN
  IF public.is_model_to_model(p_sender_id, p_recipient_id) THEN
    RETURN 0;
  ELSE
    RETURN 10;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
