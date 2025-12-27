-- ============================================
-- EXA PLATFORM - ADD FANS SUPPORT
-- ============================================

-- ============================================
-- FANS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.fans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text,
  avatar_url text,
  coin_balance int DEFAULT 0 CHECK (coin_balance >= 0),
  total_coins_purchased int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fans ENABLE ROW LEVEL SECURITY;

-- Fans can view their own profile
CREATE POLICY "Users can view own fan profile" ON public.fans
  FOR SELECT USING (user_id = auth.uid());

-- Fans can update their own profile
CREATE POLICY "Users can update own fan profile" ON public.fans
  FOR UPDATE USING (user_id = auth.uid());

-- Service role can do everything
CREATE POLICY "Service role full access to fans" ON public.fans
  FOR ALL USING (auth.role() = 'service_role');

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_fans_user_id ON public.fans(user_id);

-- ============================================
-- UPDATE COIN FUNCTIONS FOR FANS
-- ============================================

-- Drop and recreate deduct_coins to support both models and fans
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
  actor_type text;
BEGIN
  -- Get actor type
  SELECT type INTO actor_type FROM public.actors WHERE id = p_actor_id;

  IF actor_type IS NULL THEN
    RETURN false;
  END IF;

  -- Handle based on actor type
  IF actor_type = 'fan' THEN
    -- Lock the fan row for update
    SELECT coin_balance INTO current_balance
    FROM public.fans
    WHERE id = p_actor_id
    FOR UPDATE;

    IF current_balance IS NULL OR current_balance < p_amount THEN
      RETURN false;
    END IF;

    -- Deduct coins from fan
    UPDATE public.fans
    SET coin_balance = coin_balance - p_amount,
        updated_at = now()
    WHERE id = p_actor_id;
  ELSE
    -- Model or other - use models table
    SELECT coin_balance INTO current_balance
    FROM public.models
    WHERE id = p_actor_id
    FOR UPDATE;

    IF current_balance IS NULL OR current_balance < p_amount THEN
      RETURN false;
    END IF;

    UPDATE public.models
    SET coin_balance = coin_balance - p_amount
    WHERE id = p_actor_id;
  END IF;

  -- Record transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, message_id, metadata)
  VALUES (p_actor_id, -p_amount, p_action, p_message_id, p_metadata);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate add_coins to support both models and fans
CREATE OR REPLACE FUNCTION public.add_coins(
  p_actor_id uuid,
  p_amount int,
  p_action text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS boolean AS $$
DECLARE
  actor_type text;
BEGIN
  -- Get actor type
  SELECT type INTO actor_type FROM public.actors WHERE id = p_actor_id;

  IF actor_type IS NULL THEN
    RETURN false;
  END IF;

  -- Handle based on actor type
  IF actor_type = 'fan' THEN
    UPDATE public.fans
    SET coin_balance = coin_balance + p_amount,
        total_coins_purchased = CASE WHEN p_action = 'purchase'
          THEN total_coins_purchased + p_amount
          ELSE total_coins_purchased END,
        updated_at = now()
    WHERE id = p_actor_id;

    IF NOT FOUND THEN
      RETURN false;
    END IF;
  ELSE
    UPDATE public.models
    SET coin_balance = coin_balance + p_amount
    WHERE id = p_actor_id;

    IF NOT FOUND THEN
      RETURN false;
    END IF;
  END IF;

  -- Record transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_actor_id, p_amount, p_action, p_metadata);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get coin balance for any actor
CREATE OR REPLACE FUNCTION public.get_coin_balance(p_actor_id uuid)
RETURNS int AS $$
DECLARE
  actor_type text;
  balance int;
BEGIN
  SELECT type INTO actor_type FROM public.actors WHERE id = p_actor_id;

  IF actor_type = 'fan' THEN
    SELECT coin_balance INTO balance FROM public.fans WHERE id = p_actor_id;
  ELSE
    SELECT coin_balance INTO balance FROM public.models WHERE id = p_actor_id;
  END IF;

  RETURN COALESCE(balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ALLOW FANS TO VIEW MODELS (for messaging)
-- ============================================

-- Fans can view approved models
CREATE POLICY "Fans can view approved models" ON public.models
  FOR SELECT USING (
    is_approved = true
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type IN ('admin', 'fan'))
  );
