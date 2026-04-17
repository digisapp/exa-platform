-- =============================================================================
-- Unify premium content: migrate from premium_content/content_unlocks
-- to the content_items/content_purchases system.
--
-- Phase 1 of retirement: old tables become READ-ONLY audit trail.
-- They will be dropped after 2026-07-17 (90-day window).
-- =============================================================================

-- 1. Add legacy mapping column so we can link old IDs to new content_items rows
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS legacy_premium_content_id UUID;

CREATE INDEX IF NOT EXISTS idx_content_items_legacy_pc_id
  ON public.content_items (legacy_premium_content_id)
  WHERE legacy_premium_content_id IS NOT NULL;

-- 2. Backfill the mapping for items already copied by migration 20260323000001.
--    Match on model_id + media_url + status='exclusive' (the original copy criteria).
UPDATE public.content_items ci
SET legacy_premium_content_id = pc.id
FROM public.premium_content pc
WHERE ci.model_id = pc.model_id
  AND ci.media_url = pc.media_url
  AND ci.status = 'exclusive'
  AND ci.legacy_premium_content_id IS NULL;

-- 3. Copy any premium_content rows that were created AFTER the original migration
--    and therefore were never synced to content_items.
INSERT INTO public.content_items (
  model_id, title, description, media_url, media_type,
  preview_url, status, coin_price, unlock_count,
  created_at, legacy_premium_content_id
)
SELECT
  pc.model_id,
  pc.title,
  pc.description,
  pc.media_url,
  pc.media_type,
  pc.preview_url,
  'exclusive',
  pc.coin_price,
  COALESCE(pc.unlock_count, 0),
  pc.created_at,
  pc.id
FROM public.premium_content pc
WHERE pc.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.content_items ci
    WHERE ci.legacy_premium_content_id = pc.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.content_items ci
    WHERE ci.model_id = pc.model_id
      AND ci.media_url = pc.media_url
      AND ci.status = 'exclusive'
  );

-- 4. Migrate content_unlocks → content_purchases using the legacy mapping.
INSERT INTO public.content_purchases (buyer_id, item_id, coins_spent, created_at)
SELECT
  cu.buyer_id,
  ci.id,
  cu.amount_paid,
  cu.created_at
FROM public.content_unlocks cu
JOIN public.content_items ci ON ci.legacy_premium_content_id = cu.content_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.content_purchases cp
  WHERE cp.buyer_id = cu.buyer_id AND cp.item_id = ci.id
);

-- 5. Replace get_unlocked_media_urls to use content_items/content_purchases.
--    This is a DROP + CREATE so both old and new callers use the same function name.
CREATE OR REPLACE FUNCTION public.get_unlocked_media_urls(
  p_content_ids uuid[],
  p_buyer_id uuid
)
RETURNS TABLE(content_id uuid, media_url text) AS $$
BEGIN
  RETURN QUERY
  SELECT ci.id AS content_id, ci.media_url
  FROM public.content_items ci
  WHERE ci.id = ANY(p_content_ids)
    AND ci.status = 'exclusive'
    AND (
      -- Owner (model) always sees their content
      EXISTS (
        SELECT 1 FROM public.models m
        WHERE m.id = ci.model_id AND m.user_id = auth.uid()
      )
      -- Admin sees all
      OR EXISTS (
        SELECT 1 FROM public.actors a
        WHERE a.user_id = auth.uid() AND a.type = 'admin'
      )
      -- Buyer has unlocked this item directly
      OR EXISTS (
        SELECT 1 FROM public.content_purchases cp
        WHERE cp.item_id = ci.id AND cp.buyer_id = p_buyer_id
      )
      -- Buyer has unlocked the set this item belongs to
      OR (ci.set_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.content_purchases cp
        WHERE cp.set_id = ci.set_id AND cp.buyer_id = p_buyer_id
      ))
      -- Free content
      OR ci.coin_price = 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fix unlock_content_item: the original version from 20260323000001 only
--    handled fan/model (incorrectly) and missed brand/admin support.
--    This version matches the battle-tested unlock_content logic exactly.
CREATE OR REPLACE FUNCTION public.unlock_content_item(
  p_buyer_id UUID,
  p_item_id UUID
)
RETURNS jsonb AS $$
DECLARE
  buyer_type TEXT;
  buyer_balance INT;
  v_item RECORD;
  model_actor_id UUID;
BEGIN
  -- Get content item with model info
  SELECT ci.*, m.id AS owner_model_id, m.user_id AS model_user_id
  INTO v_item
  FROM public.content_items ci
  JOIN public.models m ON m.id = ci.model_id
  WHERE ci.id = p_item_id
    AND ci.status = 'exclusive'
    AND (ci.publish_at IS NULL OR ci.publish_at <= now());

  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Content not found or not available');
  END IF;

  -- Get the model's actor ID (models.id != actors.id)
  SELECT id INTO model_actor_id
  FROM public.actors
  WHERE user_id = v_item.model_user_id AND type = 'model';

  -- Can't buy own content (compare actor IDs, not model ID vs actor ID)
  IF model_actor_id = p_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot unlock your own content');
  END IF;

  -- Check if already unlocked (item or set)
  IF EXISTS (
    SELECT 1 FROM public.content_purchases
    WHERE buyer_id = p_buyer_id
    AND (item_id = p_item_id OR (v_item.set_id IS NOT NULL AND set_id = v_item.set_id))
  ) THEN
    RETURN jsonb_build_object('success', true, 'already_unlocked', true, 'media_url', v_item.media_url);
  END IF;

  -- Get buyer info
  SELECT type INTO buyer_type FROM public.actors WHERE id = p_buyer_id;
  IF buyer_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Buyer not found');
  END IF;

  -- Get buyer balance based on type (matching unlock_content behavior)
  IF buyer_type = 'fan' THEN
    SELECT coin_balance INTO buyer_balance FROM public.fans WHERE id = p_buyer_id FOR UPDATE;
  ELSIF buyer_type = 'model' THEN
    SELECT coin_balance INTO buyer_balance FROM public.models
    WHERE user_id = (SELECT user_id FROM public.actors WHERE id = p_buyer_id) FOR UPDATE;
  ELSIF buyer_type = 'brand' THEN
    SELECT coin_balance INTO buyer_balance FROM public.brands WHERE id = p_buyer_id FOR UPDATE;
  ELSIF buyer_type = 'admin' THEN
    buyer_balance := 999999;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid buyer type');
  END IF;

  IF buyer_balance IS NULL OR buyer_balance < v_item.coin_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient coins',
      'balance', COALESCE(buyer_balance, 0),
      'required', v_item.coin_price
    );
  END IF;

  -- Deduct from buyer (skip for admins)
  IF buyer_type = 'fan' THEN
    UPDATE public.fans SET coin_balance = coin_balance - v_item.coin_price, updated_at = now() WHERE id = p_buyer_id;
  ELSIF buyer_type = 'model' THEN
    UPDATE public.models SET coin_balance = coin_balance - v_item.coin_price
    WHERE user_id = (SELECT user_id FROM public.actors WHERE id = p_buyer_id);
  ELSIF buyer_type = 'brand' THEN
    UPDATE public.brands SET coin_balance = coin_balance - v_item.coin_price WHERE id = p_buyer_id;
  END IF;
  -- Admin: no deduction (unlimited coins)

  -- Credit to model
  UPDATE public.models SET coin_balance = coin_balance + v_item.coin_price WHERE id = v_item.owner_model_id;

  -- Record purchase
  INSERT INTO public.content_purchases (buyer_id, item_id, coins_spent)
  VALUES (p_buyer_id, p_item_id, v_item.coin_price);

  -- Increment unlock count
  UPDATE public.content_items SET unlock_count = unlock_count + 1, updated_at = now() WHERE id = p_item_id;

  -- Record buyer transaction (actor ID - correct)
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_buyer_id, -v_item.coin_price, 'content_unlock', jsonb_build_object(
    'content_item_id', p_item_id,
    'model_id', v_item.owner_model_id
  ));

  -- Record model sale transaction (use model's ACTOR ID, not models.id)
  IF model_actor_id IS NOT NULL THEN
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
    VALUES (model_actor_id, v_item.coin_price, 'content_sale', jsonb_build_object(
      'content_item_id', p_item_id,
      'buyer_id', p_buyer_id
    ));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'media_url', v_item.media_url,
    'amount_paid', v_item.coin_price,
    'new_balance', buyer_balance - v_item.coin_price
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Also fix unlock_content_set with the same actor-type handling
CREATE OR REPLACE FUNCTION public.unlock_content_set(
  p_buyer_id UUID,
  p_set_id UUID
)
RETURNS jsonb AS $$
DECLARE
  buyer_type TEXT;
  buyer_balance INT;
  v_set RECORD;
  v_item_count INT;
  model_actor_id UUID;
BEGIN
  -- Get set with model info
  SELECT cs.*, m.id AS owner_model_id, m.user_id AS model_user_id
  INTO v_set
  FROM public.content_sets cs
  JOIN public.models m ON m.id = cs.model_id
  WHERE cs.id = p_set_id AND cs.status = 'live' AND cs.coin_price IS NOT NULL;

  IF v_set IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Set not found or not available');
  END IF;

  -- Get the model's actor ID
  SELECT id INTO model_actor_id
  FROM public.actors
  WHERE user_id = v_set.model_user_id AND type = 'model';

  IF model_actor_id = p_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot unlock your own set');
  END IF;

  -- Check if already purchased
  IF EXISTS (SELECT 1 FROM public.content_purchases WHERE buyer_id = p_buyer_id AND set_id = p_set_id) THEN
    RETURN jsonb_build_object('success', true, 'already_unlocked', true);
  END IF;

  SELECT type INTO buyer_type FROM public.actors WHERE id = p_buyer_id;
  IF buyer_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Buyer not found');
  END IF;

  -- Get buyer balance based on type
  IF buyer_type = 'fan' THEN
    SELECT coin_balance INTO buyer_balance FROM public.fans WHERE id = p_buyer_id FOR UPDATE;
  ELSIF buyer_type = 'model' THEN
    SELECT coin_balance INTO buyer_balance FROM public.models
    WHERE user_id = (SELECT user_id FROM public.actors WHERE id = p_buyer_id) FOR UPDATE;
  ELSIF buyer_type = 'brand' THEN
    SELECT coin_balance INTO buyer_balance FROM public.brands WHERE id = p_buyer_id FOR UPDATE;
  ELSIF buyer_type = 'admin' THEN
    buyer_balance := 999999;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid buyer type');
  END IF;

  IF buyer_balance IS NULL OR buyer_balance < v_set.coin_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient coins',
      'balance', COALESCE(buyer_balance, 0),
      'required', v_set.coin_price
    );
  END IF;

  -- Deduct from buyer (skip for admins)
  IF buyer_type = 'fan' THEN
    UPDATE public.fans SET coin_balance = coin_balance - v_set.coin_price, updated_at = now() WHERE id = p_buyer_id;
  ELSIF buyer_type = 'model' THEN
    UPDATE public.models SET coin_balance = coin_balance - v_set.coin_price
    WHERE user_id = (SELECT user_id FROM public.actors WHERE id = p_buyer_id);
  ELSIF buyer_type = 'brand' THEN
    UPDATE public.brands SET coin_balance = coin_balance - v_set.coin_price WHERE id = p_buyer_id;
  END IF;

  -- Credit to model
  UPDATE public.models SET coin_balance = coin_balance + v_set.coin_price WHERE id = v_set.owner_model_id;

  -- Record set purchase
  INSERT INTO public.content_purchases (buyer_id, set_id, coins_spent)
  VALUES (p_buyer_id, p_set_id, v_set.coin_price);

  -- Count items in set for unlock_count updates
  SELECT COUNT(*) INTO v_item_count FROM public.content_items WHERE set_id = p_set_id AND status = 'exclusive';

  -- Increment unlock count on all set items
  UPDATE public.content_items SET unlock_count = unlock_count + 1, updated_at = now()
  WHERE set_id = p_set_id AND status = 'exclusive';

  -- Record buyer transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_buyer_id, -v_set.coin_price, 'content_unlock', jsonb_build_object(
    'content_set_id', p_set_id,
    'model_id', v_set.owner_model_id,
    'item_count', v_item_count
  ));

  -- Record model sale transaction (use ACTOR ID)
  IF model_actor_id IS NOT NULL THEN
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
    VALUES (model_actor_id, v_set.coin_price, 'content_sale', jsonb_build_object(
      'content_set_id', p_set_id,
      'buyer_id', p_buyer_id,
      'item_count', v_item_count
    ));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'amount_paid', v_set.coin_price,
    'items_unlocked', v_item_count,
    'new_balance', buyer_balance - v_set.coin_price
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Mark old tables as deprecated
COMMENT ON TABLE public.premium_content IS
  'DEPRECATED 2026-04-17: Use content_items with status=exclusive. Read-only audit trail, drop after 2026-07-17.';
COMMENT ON TABLE public.content_unlocks IS
  'DEPRECATED 2026-04-17: Use content_purchases. Read-only audit trail, drop after 2026-07-17.';
