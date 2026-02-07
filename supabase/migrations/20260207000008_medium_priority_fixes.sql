-- =============================================
-- MEDIUM PRIORITY FIXES
-- 1. Fix transfer_coins to handle brand sender type
-- 2. Fix deduct_coins to handle all actor types (fan, brand, model)
-- 3. Restrict page_views insert policy to require auth
-- 4. Restrict content_program_enrollments insert to require auth
-- 5. Restrict top_model_votes insert to require auth
-- 6. Add unique constraint on fan username (partial, non-null only)
-- 7. Add SECURITY DEFINER to reserve_stock and release_stock
-- =============================================


-- =============================================
-- 1. FIX transfer_coins TO HANDLE BRAND SENDER TYPE
-- Previously only handled 'fan' and else (model).
-- Now explicitly handles fan, brand, and model.
-- =============================================

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
  ELSIF sender_type = 'brand' THEN
    SELECT coin_balance INTO sender_balance
    FROM public.brands
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
  ELSIF sender_type = 'brand' THEN
    UPDATE public.brands
    SET coin_balance = coin_balance - p_amount
    WHERE id = p_sender_id;
  ELSE
    UPDATE public.models
    SET coin_balance = coin_balance - p_amount
    WHERE id = p_sender_id;
  END IF;

  -- Credit to recipient
  IF recipient_type = 'model' THEN
    UPDATE public.models
    SET coin_balance = coin_balance + p_amount
    WHERE id = p_recipient_id;
  ELSIF recipient_type = 'fan' THEN
    UPDATE public.fans
    SET coin_balance = coin_balance + p_amount,
        updated_at = now()
    WHERE id = p_recipient_id;
  ELSIF recipient_type = 'brand' THEN
    UPDATE public.brands
    SET coin_balance = coin_balance + p_amount
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


-- =============================================
-- 2. FIX deduct_coins TO HANDLE ALL ACTOR TYPES
-- Previously only handled 'fan' and else (model).
-- Now explicitly handles fan, brand, and model.
-- =============================================

CREATE OR REPLACE FUNCTION public.deduct_coins(p_actor_id uuid, p_amount int)
RETURNS boolean AS $$
DECLARE
  v_type text;
  v_balance int;
BEGIN
  SELECT type INTO v_type FROM public.actors WHERE id = p_actor_id;

  IF v_type = 'fan' THEN
    SELECT coin_balance INTO v_balance FROM public.fans WHERE id = p_actor_id FOR UPDATE;
    IF v_balance >= p_amount THEN
      UPDATE public.fans SET coin_balance = coin_balance - p_amount WHERE id = p_actor_id;
      RETURN true;
    END IF;
  ELSIF v_type = 'brand' THEN
    SELECT coin_balance INTO v_balance FROM public.brands WHERE id = p_actor_id FOR UPDATE;
    IF v_balance >= p_amount THEN
      UPDATE public.brands SET coin_balance = coin_balance - p_amount WHERE id = p_actor_id;
      RETURN true;
    END IF;
  ELSIF v_type = 'model' THEN
    SELECT coin_balance INTO v_balance FROM public.models WHERE id = p_actor_id FOR UPDATE;
    IF v_balance >= p_amount THEN
      UPDATE public.models SET coin_balance = coin_balance - p_amount WHERE id = p_actor_id;
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- 3. RESTRICT page_views INSERT POLICY TO REQUIRE AUTH
-- Previously allowed anyone (WITH CHECK (true)).
-- Now requires auth.uid() IS NOT NULL.
-- =============================================

DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Authenticated users can insert page views" ON public.page_views
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- =============================================
-- 4. RESTRICT content_program_enrollments INSERT TO REQUIRE AUTH
-- Previously allowed any public insert with status = 'pending'.
-- Now also requires auth.uid() IS NOT NULL.
-- =============================================

DROP POLICY IF EXISTS "Public can create pending enrollments" ON public.content_program_enrollments;
CREATE POLICY "Authenticated users can create pending enrollments" ON public.content_program_enrollments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND status = 'pending');


-- =============================================
-- 5. RESTRICT top_model_votes INSERT TO REQUIRE AUTH
-- Previously allowed anyone (WITH CHECK (true)).
-- Now requires auth.uid() IS NOT NULL.
-- =============================================

DROP POLICY IF EXISTS "Anyone can vote" ON public.top_model_votes;
CREATE POLICY "Authenticated users can vote" ON public.top_model_votes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- =============================================
-- 6. ADD UNIQUE CONSTRAINT ON FAN USERNAME (PARTIAL INDEX)
-- Only enforce uniqueness where username is not null.
-- =============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_fans_username_unique
  ON public.fans (username)
  WHERE username IS NOT NULL;


-- =============================================
-- 7. ADD SECURITY DEFINER TO reserve_stock AND release_stock
-- Restrict execution to service role only.
-- =============================================

CREATE OR REPLACE FUNCTION public.reserve_stock(p_variant_id UUID, p_quantity INT)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_stock INT;
BEGIN
  SELECT stock_quantity INTO v_current_stock
  FROM public.shop_product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF v_current_stock IS NULL OR v_current_stock < p_quantity THEN
    RETURN FALSE;
  END IF;

  UPDATE public.shop_product_variants
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = p_variant_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.release_stock(p_variant_id UUID, p_quantity INT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.shop_product_variants
  SET stock_quantity = stock_quantity + p_quantity
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke from public/authenticated - only service role should call these
REVOKE EXECUTE ON FUNCTION public.reserve_stock FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.release_stock FROM authenticated;
