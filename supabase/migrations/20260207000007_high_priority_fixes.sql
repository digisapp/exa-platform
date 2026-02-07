-- =============================================
-- HIGH PRIORITY FIXES
-- Migration: 20260207000007_high_priority_fixes.sql
-- =============================================


-- =============================================
-- 1. FIX add_coins TO HANDLE ALL ACTOR TYPES
-- Previously only updated the models table.
-- Now routes to fans, brands, or models based
-- on the actor's type.
-- =============================================

CREATE OR REPLACE FUNCTION public.add_coins(
  p_actor_id uuid,
  p_amount int,
  p_action text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS boolean AS $$
DECLARE
  v_type text;
BEGIN
  -- Determine actor type
  SELECT type INTO v_type FROM public.actors WHERE id = p_actor_id;

  IF v_type IS NULL THEN
    RETURN false;
  END IF;

  -- Route update to the correct table
  IF v_type = 'fan' THEN
    UPDATE public.fans SET coin_balance = coin_balance + p_amount WHERE id = p_actor_id;
  ELSIF v_type = 'brand' THEN
    UPDATE public.brands SET coin_balance = coin_balance + p_amount WHERE id = p_actor_id;
  ELSE
    UPDATE public.models SET coin_balance = coin_balance + p_amount WHERE id = p_actor_id;
  END IF;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Record transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_actor_id, p_amount, p_action, p_metadata);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- 2. RESTRICT top_model_sessions RLS
-- Replace the overly permissive FOR ALL
-- policy with specific per-operation policies.
-- =============================================

DROP POLICY IF EXISTS "Anyone can manage sessions" ON public.top_model_sessions;

-- Allow anyone to view sessions (needed for anonymous game flow)
CREATE POLICY "Anyone can view sessions" ON public.top_model_sessions
  FOR SELECT USING (true);

-- Only authenticated users can create sessions
CREATE POLICY "Authenticated users can create sessions" ON public.top_model_sessions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can only update their own sessions
CREATE POLICY "Users can update own sessions" ON public.top_model_sessions
  FOR UPDATE USING (user_id = auth.uid());


-- =============================================
-- 3. REVOKE DIRECT RPC ACCESS TO WITHDRAWAL
-- FUNCTIONS FROM AUTHENTICATED USERS
-- These should only be called via the service
-- role client from admin API routes.
-- =============================================

REVOKE EXECUTE ON FUNCTION public.complete_withdrawal(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_withdrawal(uuid) FROM authenticated;


-- =============================================
-- 4. FIX SMS LOGS RLS POLICY
-- The "Service role insert sms_logs" policy
-- used WITH CHECK (true) which allows any role
-- to insert. Service role bypasses RLS
-- automatically, so no insert policy is needed.
-- =============================================

DROP POLICY IF EXISTS "Service role insert sms_logs" ON public.sms_logs;


-- =============================================
-- 5. ATOMIC OFFER SPOTS ACCEPTANCE RPC
-- Locks the offer row to prevent race
-- conditions when multiple models accept
-- simultaneously, ensuring spots_filled
-- never exceeds spots.
-- =============================================

CREATE OR REPLACE FUNCTION public.accept_offer_spot(
  p_offer_id uuid,
  p_response_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_offer RECORD;
BEGIN
  -- Lock the offer row to prevent race conditions
  SELECT * INTO v_offer
  FROM public.offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF v_offer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer not found');
  END IF;

  IF v_offer.spots_filled >= v_offer.spots THEN
    RETURN jsonb_build_object('success', false, 'error', 'All spots have been filled');
  END IF;

  -- Increment spots filled
  UPDATE public.offers
  SET spots_filled = spots_filled + 1
  WHERE id = p_offer_id;

  -- Update response status to accepted
  UPDATE public.offer_responses
  SET status = 'accepted', responded_at = now()
  WHERE id = p_response_id;

  RETURN jsonb_build_object(
    'success', true,
    'spots_filled', v_offer.spots_filled + 1,
    'total_spots', v_offer.spots
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- 6. ATOMIC INCREMENT RPC FOR SHOP total_sold
-- Prevents race conditions when multiple
-- purchases of the same product happen
-- concurrently.
-- =============================================

CREATE OR REPLACE FUNCTION public.increment_total_sold(
  p_product_id uuid,
  p_quantity int
)
RETURNS void AS $$
BEGIN
  UPDATE public.shop_products
  SET total_sold = COALESCE(total_sold, 0) + p_quantity
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
