-- Content System: Unified content management for models
-- Replaces the split between media_assets (portfolio) and premium_content (PPV)
-- with a single content_items table and adds Sets, Purchases, and scheduled drops.

-- ============================================================
-- 1. CONTENT SETS (created first, referenced by content_items)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_item_id UUID, -- FK added after content_items exists
  coin_price INTEGER CHECK (coin_price IS NULL OR coin_price >= 0), -- bundle price, NULL = no bundle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'archived')),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. CONTENT ITEMS (the unified content table)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  media_url TEXT NOT NULL, -- storage path (signed URLs generated at read time)
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  preview_url TEXT, -- blurred/cropped preview for exclusive content
  status TEXT NOT NULL DEFAULT 'private' CHECK (status IN ('private', 'portfolio', 'exclusive')),
  coin_price INTEGER NOT NULL DEFAULT 0 CHECK (coin_price >= 0),
  set_id UUID REFERENCES public.content_sets(id) ON DELETE SET NULL,
  publish_at TIMESTAMPTZ, -- scheduled drop: NULL = immediate, future = hidden until then
  position INTEGER DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  unlock_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add the cover_item FK now that content_items exists
ALTER TABLE public.content_sets
  ADD CONSTRAINT fk_cover_item
  FOREIGN KEY (cover_item_id) REFERENCES public.content_items(id) ON DELETE SET NULL;

-- ============================================================
-- 3. CONTENT PURCHASES (unified purchase tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  set_id UUID REFERENCES public.content_sets(id) ON DELETE SET NULL,
  coins_spent INTEGER NOT NULL CHECK (coins_spent >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Must reference either an item or a set
  CONSTRAINT purchase_target CHECK (item_id IS NOT NULL OR set_id IS NOT NULL)
);

-- Unique constraint: one purchase per buyer per item
CREATE UNIQUE INDEX idx_content_purchases_buyer_item
  ON public.content_purchases(buyer_id, item_id) WHERE item_id IS NOT NULL;

-- Unique constraint: one purchase per buyer per set
CREATE UNIQUE INDEX idx_content_purchases_buyer_set
  ON public.content_purchases(buyer_id, set_id) WHERE set_id IS NOT NULL;

-- ============================================================
-- 4. INDEXES
-- ============================================================

-- content_items
CREATE INDEX idx_content_items_model ON public.content_items(model_id);
CREATE INDEX idx_content_items_status ON public.content_items(status);
CREATE INDEX idx_content_items_set ON public.content_items(set_id) WHERE set_id IS NOT NULL;
CREATE INDEX idx_content_items_publish ON public.content_items(publish_at) WHERE publish_at IS NOT NULL;
CREATE INDEX idx_content_items_model_status ON public.content_items(model_id, status);
CREATE INDEX idx_content_items_tags ON public.content_items USING GIN(tags);
CREATE INDEX idx_content_items_created ON public.content_items(created_at DESC);

-- content_sets
CREATE INDEX idx_content_sets_model ON public.content_sets(model_id);
CREATE INDEX idx_content_sets_status ON public.content_sets(status);

-- content_purchases
CREATE INDEX idx_content_purchases_buyer ON public.content_purchases(buyer_id);
CREATE INDEX idx_content_purchases_item ON public.content_purchases(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX idx_content_purchases_set ON public.content_purchases(set_id) WHERE set_id IS NOT NULL;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

-- content_items: models manage their own, fans see published content
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Models manage own content items"
  ON public.content_items FOR ALL
  TO authenticated
  USING (
    model_id IN (
      SELECT id FROM public.models WHERE id = (
        SELECT id FROM public.actors WHERE user_id = auth.uid() AND type IN ('model', 'admin')
      )
    )
  )
  WITH CHECK (
    model_id IN (
      SELECT id FROM public.models WHERE id = (
        SELECT id FROM public.actors WHERE user_id = auth.uid() AND type IN ('model', 'admin')
      )
    )
  );

CREATE POLICY "Anyone can view published content items"
  ON public.content_items FOR SELECT
  TO authenticated
  USING (
    status IN ('portfolio', 'exclusive')
    AND (publish_at IS NULL OR publish_at <= now())
  );

CREATE POLICY "Anon can view published content items"
  ON public.content_items FOR SELECT
  TO anon
  USING (
    status IN ('portfolio', 'exclusive')
    AND (publish_at IS NULL OR publish_at <= now())
  );

CREATE POLICY "Service role bypass content items"
  ON public.content_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view all content items
CREATE POLICY "Admins can view all content items"
  ON public.content_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- content_sets: models manage their own, public can view live sets
ALTER TABLE public.content_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Models manage own sets"
  ON public.content_sets FOR ALL
  TO authenticated
  USING (
    model_id IN (
      SELECT id FROM public.models WHERE id = (
        SELECT id FROM public.actors WHERE user_id = auth.uid() AND type IN ('model', 'admin')
      )
    )
  )
  WITH CHECK (
    model_id IN (
      SELECT id FROM public.models WHERE id = (
        SELECT id FROM public.actors WHERE user_id = auth.uid() AND type IN ('model', 'admin')
      )
    )
  );

CREATE POLICY "Anyone can view live sets"
  ON public.content_sets FOR SELECT
  TO authenticated
  USING (status = 'live');

CREATE POLICY "Anon can view live sets"
  ON public.content_sets FOR SELECT
  TO anon
  USING (status = 'live');

CREATE POLICY "Service role bypass content sets"
  ON public.content_sets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- content_purchases: buyers see their own, models see sales
ALTER TABLE public.content_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers view own purchases"
  ON public.content_purchases FOR SELECT
  TO authenticated
  USING (buyer_id = (SELECT id FROM public.actors WHERE user_id = auth.uid()));

CREATE POLICY "Models view sales of their content"
  ON public.content_purchases FOR SELECT
  TO authenticated
  USING (
    item_id IN (SELECT id FROM public.content_items WHERE model_id = (
      SELECT id FROM public.actors WHERE user_id = auth.uid() AND type = 'model'
    ))
    OR set_id IN (SELECT id FROM public.content_sets WHERE model_id = (
      SELECT id FROM public.actors WHERE user_id = auth.uid() AND type = 'model'
    ))
  );

CREATE POLICY "Service role bypass content purchases"
  ON public.content_purchases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 6. UNLOCK CONTENT ITEM (atomic coin transfer)
-- ============================================================
CREATE OR REPLACE FUNCTION public.unlock_content_item(
  p_buyer_id UUID,
  p_item_id UUID
)
RETURNS jsonb AS $$
DECLARE
  buyer_type TEXT;
  buyer_balance INT;
  v_item RECORD;
BEGIN
  -- Get content item
  SELECT ci.*, m.id AS owner_id
  INTO v_item
  FROM public.content_items ci
  JOIN public.models m ON m.id = ci.model_id
  WHERE ci.id = p_item_id
    AND ci.status = 'exclusive'
    AND (ci.publish_at IS NULL OR ci.publish_at <= now());

  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Content not found or not available');
  END IF;

  -- Can't buy own content
  IF v_item.owner_id = p_buyer_id THEN
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

  -- Get buyer balance with lock
  IF buyer_type = 'fan' THEN
    SELECT coin_balance INTO buyer_balance FROM public.fans WHERE id = p_buyer_id FOR UPDATE;
  ELSE
    SELECT coin_balance INTO buyer_balance FROM public.models WHERE id = p_buyer_id FOR UPDATE;
  END IF;

  IF buyer_balance IS NULL OR buyer_balance < v_item.coin_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient coins',
      'balance', COALESCE(buyer_balance, 0),
      'required', v_item.coin_price
    );
  END IF;

  -- Deduct from buyer
  IF buyer_type = 'fan' THEN
    UPDATE public.fans SET coin_balance = coin_balance - v_item.coin_price, updated_at = now() WHERE id = p_buyer_id;
  ELSE
    UPDATE public.models SET coin_balance = coin_balance - v_item.coin_price WHERE id = p_buyer_id;
  END IF;

  -- Credit to model
  UPDATE public.models SET coin_balance = coin_balance + v_item.coin_price WHERE id = v_item.model_id;

  -- Record purchase
  INSERT INTO public.content_purchases (buyer_id, item_id, coins_spent)
  VALUES (p_buyer_id, p_item_id, v_item.coin_price);

  -- Increment unlock count
  UPDATE public.content_items SET unlock_count = unlock_count + 1, updated_at = now() WHERE id = p_item_id;

  -- Record transactions
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_buyer_id, -v_item.coin_price, 'content_unlock', jsonb_build_object('content_item_id', p_item_id, 'model_id', v_item.model_id));

  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (v_item.model_id, v_item.coin_price, 'content_sale', jsonb_build_object('content_item_id', p_item_id, 'buyer_id', p_buyer_id));

  RETURN jsonb_build_object(
    'success', true,
    'media_url', v_item.media_url,
    'amount_paid', v_item.coin_price,
    'new_balance', buyer_balance - v_item.coin_price
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. UNLOCK CONTENT SET (atomic coin transfer for bundle)
-- ============================================================
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
BEGIN
  -- Get set with model info
  SELECT cs.*, m.id AS owner_id
  INTO v_set
  FROM public.content_sets cs
  JOIN public.models m ON m.id = cs.model_id
  WHERE cs.id = p_set_id AND cs.status = 'live' AND cs.coin_price IS NOT NULL;

  IF v_set IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Set not found or not available');
  END IF;

  IF v_set.owner_id = p_buyer_id THEN
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

  IF buyer_type = 'fan' THEN
    SELECT coin_balance INTO buyer_balance FROM public.fans WHERE id = p_buyer_id FOR UPDATE;
  ELSE
    SELECT coin_balance INTO buyer_balance FROM public.models WHERE id = p_buyer_id FOR UPDATE;
  END IF;

  IF buyer_balance IS NULL OR buyer_balance < v_set.coin_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient coins',
      'balance', COALESCE(buyer_balance, 0),
      'required', v_set.coin_price
    );
  END IF;

  -- Deduct from buyer
  IF buyer_type = 'fan' THEN
    UPDATE public.fans SET coin_balance = coin_balance - v_set.coin_price, updated_at = now() WHERE id = p_buyer_id;
  ELSE
    UPDATE public.models SET coin_balance = coin_balance - v_set.coin_price WHERE id = p_buyer_id;
  END IF;

  -- Credit to model
  UPDATE public.models SET coin_balance = coin_balance + v_set.coin_price WHERE id = v_set.model_id;

  -- Record set purchase
  INSERT INTO public.content_purchases (buyer_id, set_id, coins_spent)
  VALUES (p_buyer_id, p_set_id, v_set.coin_price);

  -- Count items in set for unlock_count updates
  SELECT COUNT(*) INTO v_item_count FROM public.content_items WHERE set_id = p_set_id AND status = 'exclusive';

  -- Increment unlock count on all set items
  UPDATE public.content_items SET unlock_count = unlock_count + 1, updated_at = now()
  WHERE set_id = p_set_id AND status = 'exclusive';

  -- Record transactions
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_buyer_id, -v_set.coin_price, 'content_unlock', jsonb_build_object('content_set_id', p_set_id, 'model_id', v_set.model_id, 'item_count', v_item_count));

  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (v_set.model_id, v_set.coin_price, 'content_sale', jsonb_build_object('content_set_id', p_set_id, 'buyer_id', p_buyer_id, 'item_count', v_item_count));

  RETURN jsonb_build_object(
    'success', true,
    'amount_paid', v_set.coin_price,
    'items_unlocked', v_item_count,
    'new_balance', buyer_balance - v_set.coin_price
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. COPY EXISTING DATA INTO content_items
-- Preserves all existing content. Original tables are untouched.
-- ============================================================

-- Copy portfolio photos from media_assets
INSERT INTO public.content_items (model_id, title, media_url, media_type, status, created_at)
SELECT
  ma.model_id,
  ma.title,
  COALESCE(ma.storage_path, ma.url, ma.photo_url),
  'image',
  'portfolio',
  ma.created_at
FROM public.media_assets ma
WHERE ma.model_id IS NOT NULL
  AND ma.asset_type = 'portfolio'
  AND COALESCE(ma.storage_path, ma.url, ma.photo_url) IS NOT NULL;

-- Copy videos from media_assets
INSERT INTO public.content_items (model_id, title, media_url, media_type, status, created_at)
SELECT
  ma.model_id,
  ma.title,
  COALESCE(ma.storage_path, ma.url),
  'video',
  'portfolio',
  ma.created_at
FROM public.media_assets ma
WHERE ma.model_id IS NOT NULL
  AND ma.asset_type = 'video'
  AND COALESCE(ma.storage_path, ma.url) IS NOT NULL;

-- Copy premium/PPV content
INSERT INTO public.content_items (model_id, title, description, media_url, media_type, preview_url, status, coin_price, unlock_count, created_at)
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
  pc.created_at
FROM public.premium_content pc
WHERE pc.is_active = true
  AND pc.coin_price > 0;

-- ============================================================
-- 9. HELPER: updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_items_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.update_content_updated_at();

CREATE TRIGGER content_sets_updated_at
  BEFORE UPDATE ON public.content_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_content_updated_at();
