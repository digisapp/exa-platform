-- ============================================
-- EXA PLATFORM - PREMIUM CONTENT SYSTEM
-- ============================================

-- Table for premium content (photos/videos that fans can unlock)
CREATE TABLE IF NOT EXISTS public.premium_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  title text,
  description text,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  preview_url text, -- Blurred/cropped preview for non-purchasers
  coin_price int NOT NULL DEFAULT 10 CHECK (coin_price >= 0),
  is_active boolean DEFAULT true,
  unlock_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table to track content unlocks
CREATE TABLE IF NOT EXISTS public.content_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.premium_content(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  amount_paid int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(content_id, buyer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_premium_content_model ON public.premium_content(model_id);
CREATE INDEX IF NOT EXISTS idx_premium_content_active ON public.premium_content(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_unlocks_buyer ON public.content_unlocks(buyer_id);
CREATE INDEX IF NOT EXISTS idx_content_unlocks_content ON public.content_unlocks(content_id);

-- Function to unlock premium content
CREATE OR REPLACE FUNCTION public.unlock_content(
  p_buyer_id uuid,
  p_content_id uuid
)
RETURNS jsonb AS $$
DECLARE
  buyer_type text;
  buyer_balance int;
  content_record RECORD;
  model_id uuid;
BEGIN
  -- Get content details
  SELECT pc.*, m.id as owner_id
  INTO content_record
  FROM public.premium_content pc
  JOIN public.models m ON m.id = pc.model_id
  WHERE pc.id = p_content_id AND pc.is_active = true;

  IF content_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Content not found or inactive');
  END IF;

  -- Can't buy your own content
  IF content_record.owner_id = p_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot unlock your own content');
  END IF;

  -- Check if already unlocked
  IF EXISTS (SELECT 1 FROM public.content_unlocks WHERE content_id = p_content_id AND buyer_id = p_buyer_id) THEN
    RETURN jsonb_build_object('success', true, 'already_unlocked', true, 'media_url', content_record.media_url);
  END IF;

  -- Get buyer info
  SELECT type INTO buyer_type FROM public.actors WHERE id = p_buyer_id;

  IF buyer_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Buyer not found');
  END IF;

  -- Get buyer balance
  IF buyer_type = 'fan' THEN
    SELECT coin_balance INTO buyer_balance FROM public.fans WHERE id = p_buyer_id FOR UPDATE;
  ELSE
    SELECT coin_balance INTO buyer_balance FROM public.models WHERE id = p_buyer_id FOR UPDATE;
  END IF;

  -- Check balance
  IF buyer_balance IS NULL OR buyer_balance < content_record.coin_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient coins',
      'balance', COALESCE(buyer_balance, 0),
      'required', content_record.coin_price
    );
  END IF;

  -- Deduct from buyer
  IF buyer_type = 'fan' THEN
    UPDATE public.fans
    SET coin_balance = coin_balance - content_record.coin_price,
        updated_at = now()
    WHERE id = p_buyer_id;
  ELSE
    UPDATE public.models
    SET coin_balance = coin_balance - content_record.coin_price
    WHERE id = p_buyer_id;
  END IF;

  -- Credit to model
  UPDATE public.models
  SET coin_balance = coin_balance + content_record.coin_price
  WHERE id = content_record.model_id;

  -- Record the unlock
  INSERT INTO public.content_unlocks (content_id, buyer_id, amount_paid)
  VALUES (p_content_id, p_buyer_id, content_record.coin_price);

  -- Update unlock count
  UPDATE public.premium_content
  SET unlock_count = unlock_count + 1,
      updated_at = now()
  WHERE id = p_content_id;

  -- Record transactions
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_buyer_id, -content_record.coin_price, 'content_unlock', jsonb_build_object(
    'content_id', p_content_id,
    'model_id', content_record.model_id
  ));

  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (content_record.model_id, content_record.coin_price, 'content_sale', jsonb_build_object(
    'content_id', p_content_id,
    'buyer_id', p_buyer_id
  ));

  RETURN jsonb_build_object(
    'success', true,
    'media_url', content_record.media_url,
    'amount_paid', content_record.coin_price,
    'new_balance', buyer_balance - content_record.coin_price
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE public.premium_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_unlocks ENABLE ROW LEVEL SECURITY;

-- Everyone can view active premium content (but not the full media_url)
CREATE POLICY "Anyone can view active premium content"
  ON public.premium_content FOR SELECT
  USING (is_active = true);

-- Models can manage their own content
CREATE POLICY "Models can insert own content"
  ON public.premium_content FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.models WHERE id = model_id AND user_id = auth.uid()
  ));

CREATE POLICY "Models can update own content"
  ON public.premium_content FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.models WHERE id = model_id AND user_id = auth.uid()
  ));

CREATE POLICY "Models can delete own content"
  ON public.premium_content FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.models WHERE id = model_id AND user_id = auth.uid()
  ));

-- Users can view their own unlocks
CREATE POLICY "Users can view own unlocks"
  ON public.content_unlocks FOR SELECT
  USING (buyer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND id = buyer_id
  ));
