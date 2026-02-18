-- Fix unlock_content: use model's actor ID (not models.id) for coin_transactions
-- models.id != actors.id, so we need to look up the actor via user_id
CREATE OR REPLACE FUNCTION public.unlock_content(
  p_buyer_id uuid,
  p_content_id uuid
)
RETURNS jsonb AS $$
DECLARE
  buyer_type text;
  buyer_balance int;
  content_record RECORD;
  model_actor_id uuid;
BEGIN
  -- Get content details (include model's user_id for actor lookup)
  SELECT pc.*, m.id as owner_id, m.user_id as model_user_id
  INTO content_record
  FROM public.premium_content pc
  JOIN public.models m ON m.id = pc.model_id
  WHERE pc.id = p_content_id AND pc.is_active = true;

  IF content_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Content not found or inactive');
  END IF;

  -- Get the model's actor ID (models.id != actors.id)
  SELECT id INTO model_actor_id FROM public.actors WHERE user_id = content_record.model_user_id AND type = 'model';

  -- Can't buy your own content
  IF model_actor_id = p_buyer_id THEN
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

  -- Get buyer balance based on type
  IF buyer_type = 'fan' THEN
    SELECT coin_balance INTO buyer_balance FROM public.fans WHERE id = p_buyer_id FOR UPDATE;
  ELSIF buyer_type = 'model' THEN
    SELECT coin_balance INTO buyer_balance FROM public.models WHERE user_id = (SELECT user_id FROM public.actors WHERE id = p_buyer_id) FOR UPDATE;
  ELSIF buyer_type = 'brand' THEN
    SELECT coin_balance INTO buyer_balance FROM public.brands WHERE id = p_buyer_id FOR UPDATE;
  ELSIF buyer_type = 'admin' THEN
    buyer_balance := 999999;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid buyer type');
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

  -- Deduct from buyer (skip for admins)
  IF buyer_type = 'fan' THEN
    UPDATE public.fans
    SET coin_balance = coin_balance - content_record.coin_price,
        updated_at = now()
    WHERE id = p_buyer_id;
  ELSIF buyer_type = 'model' THEN
    UPDATE public.models
    SET coin_balance = coin_balance - content_record.coin_price
    WHERE user_id = (SELECT user_id FROM public.actors WHERE id = p_buyer_id);
  ELSIF buyer_type = 'brand' THEN
    UPDATE public.brands
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

  -- Record buyer transaction (uses actor ID - correct)
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_buyer_id, -content_record.coin_price, 'content_unlock', jsonb_build_object(
    'content_id', p_content_id,
    'model_id', content_record.model_id
  ));

  -- Record model sale transaction (use model's ACTOR ID, not models.id)
  IF model_actor_id IS NOT NULL THEN
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
    VALUES (model_actor_id, content_record.coin_price, 'content_sale', jsonb_build_object(
      'content_id', p_content_id,
      'buyer_id', p_buyer_id
    ));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'media_url', content_record.media_url,
    'amount_paid', content_record.coin_price,
    'new_balance', buyer_balance - content_record.coin_price
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
