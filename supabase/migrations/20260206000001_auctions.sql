-- ============================================
-- EXA PLATFORM - AUCTIONS FEATURE
-- ============================================
-- Models can create auctions for experiences/content
-- Users bid using coins with escrow system
-- ============================================

-- ============================================
-- AUCTIONS TABLE
-- ============================================

CREATE TABLE public.auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,

  -- Content
  title text NOT NULL,
  description text,
  deliverables text, -- What winner receives
  cover_image_url text,

  -- Pricing (in coins)
  starting_price int NOT NULL DEFAULT 100,
  reserve_price int, -- Minimum to sell (NULL = no reserve)
  buy_now_price int, -- Instant purchase price (NULL = disabled)
  current_bid int DEFAULT 0, -- Cached highest bid
  bid_count int DEFAULT 0, -- Total number of bids

  -- Timing
  ends_at timestamptz NOT NULL,
  original_end_at timestamptz NOT NULL, -- For anti-sniping tracking

  -- Status
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'ended', 'sold', 'cancelled', 'no_sale')),
  winner_id uuid REFERENCES public.actors(id),

  -- Settings
  allow_auto_bid boolean DEFAULT true,
  anti_snipe_minutes int DEFAULT 2, -- Extend by X mins if bid in last X mins

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

-- Everyone can view active/ended/sold auctions
CREATE POLICY "Active auctions are viewable by everyone" ON public.auctions
  FOR SELECT USING (
    status IN ('active', 'ended', 'sold', 'no_sale')
    OR model_id = (SELECT id FROM public.models WHERE user_id = auth.uid())
  );

-- Models can insert their own auctions
CREATE POLICY "Models can insert own auctions" ON public.auctions
  FOR INSERT WITH CHECK (
    model_id = (SELECT id FROM public.models WHERE user_id = auth.uid())
  );

-- Models can update their own auctions
CREATE POLICY "Models can update own auctions" ON public.auctions
  FOR UPDATE USING (
    model_id = (SELECT id FROM public.models WHERE user_id = auth.uid())
  );

-- Models can delete their own draft auctions
CREATE POLICY "Models can delete own draft auctions" ON public.auctions
  FOR DELETE USING (
    model_id = (SELECT id FROM public.models WHERE user_id = auth.uid())
    AND status = 'draft'
  );

-- Indexes
CREATE INDEX idx_auctions_model ON public.auctions(model_id);
CREATE INDEX idx_auctions_status ON public.auctions(status) WHERE status = 'active';
CREATE INDEX idx_auctions_ends_at ON public.auctions(ends_at) WHERE status = 'active';
CREATE INDEX idx_auctions_created ON public.auctions(created_at DESC);

-- ============================================
-- AUCTION BIDS TABLE
-- ============================================

CREATE TABLE public.auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,

  -- Bid amounts
  amount int NOT NULL, -- Bid amount in coins
  max_auto_bid int, -- Maximum for auto-bidding (NULL = manual bid only)

  -- Status
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'outbid', 'winning', 'won', 'lost', 'refunded')),
  is_buy_now boolean DEFAULT false,

  -- Escrow tracking
  escrow_amount int NOT NULL DEFAULT 0, -- Coins held in escrow
  escrow_released_at timestamptz,

  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

-- Users can view bids on active/sold auctions
CREATE POLICY "Auction bids are viewable on active auctions" ON public.auction_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.auctions
      WHERE id = auction_id
      AND status IN ('active', 'ended', 'sold', 'no_sale')
    )
    OR bidder_id = (SELECT id FROM public.actors WHERE user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_bids_auction ON public.auction_bids(auction_id, amount DESC);
CREATE INDEX idx_bids_bidder ON public.auction_bids(bidder_id);
CREATE INDEX idx_bids_status ON public.auction_bids(status) WHERE status IN ('active', 'winning');

-- ============================================
-- AUCTION WATCHLIST TABLE
-- ============================================

CREATE TABLE public.auction_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  notify_outbid boolean DEFAULT true,
  notify_ending boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(auction_id, actor_id)
);

-- Enable RLS
ALTER TABLE public.auction_watchlist ENABLE ROW LEVEL SECURITY;

-- Users can manage their own watchlist
CREATE POLICY "Users can view own watchlist" ON public.auction_watchlist
  FOR SELECT USING (
    actor_id = (SELECT id FROM public.actors WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own watchlist" ON public.auction_watchlist
  FOR INSERT WITH CHECK (
    actor_id = (SELECT id FROM public.actors WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own watchlist" ON public.auction_watchlist
  FOR DELETE USING (
    actor_id = (SELECT id FROM public.actors WHERE user_id = auth.uid())
  );

-- Index
CREATE INDEX idx_watchlist_actor ON public.auction_watchlist(actor_id);
CREATE INDEX idx_watchlist_auction ON public.auction_watchlist(auction_id);

-- ============================================
-- HELPER FUNCTION: Get bidder balance
-- ============================================

CREATE OR REPLACE FUNCTION public.get_actor_coin_balance(p_actor_id uuid)
RETURNS int AS $$
DECLARE
  v_type text;
  v_balance int;
BEGIN
  SELECT type INTO v_type FROM public.actors WHERE id = p_actor_id;

  IF v_type = 'fan' THEN
    SELECT coin_balance INTO v_balance FROM public.fans WHERE id = p_actor_id;
  ELSIF v_type = 'brand' THEN
    SELECT coin_balance INTO v_balance FROM public.brands WHERE id = p_actor_id;
  ELSIF v_type = 'model' THEN
    SELECT coin_balance INTO v_balance FROM public.models WHERE id = p_actor_id;
  ELSE
    v_balance := 0;
  END IF;

  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Update actor coin balance
-- ============================================

CREATE OR REPLACE FUNCTION public.update_actor_coin_balance(
  p_actor_id uuid,
  p_amount int
)
RETURNS void AS $$
DECLARE
  v_type text;
BEGIN
  SELECT type INTO v_type FROM public.actors WHERE id = p_actor_id;

  IF v_type = 'fan' THEN
    UPDATE public.fans SET coin_balance = coin_balance + p_amount WHERE id = p_actor_id;
  ELSIF v_type = 'brand' THEN
    UPDATE public.brands SET coin_balance = coin_balance + p_amount WHERE id = p_actor_id;
  ELSIF v_type = 'model' THEN
    UPDATE public.models SET coin_balance = coin_balance + p_amount WHERE id = p_actor_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PLACE BID FUNCTION (with escrow)
-- ============================================

CREATE OR REPLACE FUNCTION public.place_auction_bid(
  p_auction_id uuid,
  p_bidder_id uuid,
  p_amount int,
  p_max_auto_bid int DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_auction RECORD;
  v_model_actor_id uuid;
  v_current_balance int;
  v_current_high_bid RECORD;
  v_existing_bid RECORD;
  v_escrow_needed int;
  v_bid_id uuid;
  v_anti_snipe_extended boolean := false;
BEGIN
  -- Lock the auction for update
  SELECT * INTO v_auction
  FROM public.auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  -- Validate auction exists
  IF v_auction IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction not found');
  END IF;

  -- Validate auction is active
  IF v_auction.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction is not active');
  END IF;

  -- Validate auction hasn't ended
  IF v_auction.ends_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction has ended');
  END IF;

  -- Get model's actor ID to prevent self-bidding
  SELECT a.id INTO v_model_actor_id
  FROM public.actors a
  JOIN public.models m ON m.user_id = a.user_id
  WHERE m.id = v_auction.model_id;

  -- Can't bid on own auction
  IF v_model_actor_id = p_bidder_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot bid on your own auction');
  END IF;

  -- Validate bid amount meets minimum
  IF p_amount < v_auction.starting_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bid must be at least ' || v_auction.starting_price || ' coins'
    );
  END IF;

  -- Validate bid is higher than current
  IF v_auction.current_bid IS NOT NULL AND v_auction.current_bid > 0 AND p_amount <= v_auction.current_bid THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bid must be higher than ' || v_auction.current_bid || ' coins'
    );
  END IF;

  -- Get bidder's current balance with lock
  SELECT public.get_actor_coin_balance(p_bidder_id) INTO v_current_balance;

  -- Check for existing bid (to release previous escrow)
  SELECT * INTO v_existing_bid
  FROM public.auction_bids
  WHERE auction_id = p_auction_id
    AND bidder_id = p_bidder_id
    AND status IN ('active', 'outbid', 'winning')
  FOR UPDATE;

  -- Calculate escrow needed (new bid minus already escrowed)
  v_escrow_needed := p_amount - COALESCE(v_existing_bid.escrow_amount, 0);

  -- Check sufficient balance
  IF v_current_balance < v_escrow_needed THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient coins',
      'balance', v_current_balance,
      'required', v_escrow_needed
    );
  END IF;

  -- Get current high bid for outbid notification
  SELECT * INTO v_current_high_bid
  FROM public.auction_bids
  WHERE auction_id = p_auction_id AND status = 'winning'
  LIMIT 1;

  -- Mark previous high bid as outbid (if different bidder)
  IF v_current_high_bid IS NOT NULL AND v_current_high_bid.bidder_id != p_bidder_id THEN
    UPDATE public.auction_bids
    SET status = 'outbid'
    WHERE id = v_current_high_bid.id;

    -- Create outbid notification
    INSERT INTO public.notifications (actor_id, type, title, body, data)
    VALUES (
      v_current_high_bid.bidder_id,
      'auction_outbid',
      'You''ve been outbid!',
      'Someone placed a higher bid on "' || v_auction.title || '"',
      jsonb_build_object('auction_id', p_auction_id, 'new_amount', p_amount)
    );
  END IF;

  -- Deduct escrow from bidder
  IF v_escrow_needed > 0 THEN
    PERFORM public.update_actor_coin_balance(p_bidder_id, -v_escrow_needed);

    -- Record escrow transaction
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
    VALUES (
      p_bidder_id,
      -v_escrow_needed,
      'auction_escrow',
      jsonb_build_object('auction_id', p_auction_id, 'bid_amount', p_amount)
    );
  END IF;

  -- Update or insert bid
  IF v_existing_bid IS NOT NULL THEN
    UPDATE public.auction_bids
    SET amount = p_amount,
        max_auto_bid = COALESCE(p_max_auto_bid, max_auto_bid),
        status = 'winning',
        escrow_amount = p_amount
    WHERE id = v_existing_bid.id
    RETURNING id INTO v_bid_id;
  ELSE
    INSERT INTO public.auction_bids (auction_id, bidder_id, amount, max_auto_bid, status, escrow_amount)
    VALUES (p_auction_id, p_bidder_id, p_amount, p_max_auto_bid, 'winning', p_amount)
    RETURNING id INTO v_bid_id;
  END IF;

  -- Update auction current bid and bid count
  UPDATE public.auctions
  SET current_bid = p_amount,
      bid_count = CASE WHEN v_existing_bid IS NULL THEN bid_count + 1 ELSE bid_count END,
      updated_at = now()
  WHERE id = p_auction_id;

  -- Anti-sniping: extend if bid in last X minutes
  IF v_auction.anti_snipe_minutes > 0 AND
     v_auction.ends_at - now() < (v_auction.anti_snipe_minutes || ' minutes')::interval THEN
    UPDATE public.auctions
    SET ends_at = now() + (v_auction.anti_snipe_minutes || ' minutes')::interval
    WHERE id = p_auction_id;
    v_anti_snipe_extended := true;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bid_id', v_bid_id,
    'amount', p_amount,
    'escrow_deducted', v_escrow_needed,
    'new_balance', v_current_balance - v_escrow_needed,
    'extended', v_anti_snipe_extended
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- REFUND ESCROWS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.refund_auction_escrows(
  p_auction_id uuid,
  p_exclude_bidder_id uuid DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_bid RECORD;
BEGIN
  FOR v_bid IN
    SELECT * FROM public.auction_bids
    WHERE auction_id = p_auction_id
      AND escrow_amount > 0
      AND (p_exclude_bidder_id IS NULL OR bidder_id != p_exclude_bidder_id)
    FOR UPDATE
  LOOP
    -- Refund the bidder
    PERFORM public.update_actor_coin_balance(v_bid.bidder_id, v_bid.escrow_amount);

    -- Record refund transaction
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
    VALUES (
      v_bid.bidder_id,
      v_bid.escrow_amount,
      'auction_escrow_refund',
      jsonb_build_object('auction_id', p_auction_id, 'original_bid', v_bid.amount)
    );

    -- Update bid status
    UPDATE public.auction_bids
    SET status = 'refunded',
        escrow_amount = 0,
        escrow_released_at = now()
    WHERE id = v_bid.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- BUY NOW FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.buy_now_auction(
  p_auction_id uuid,
  p_buyer_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_auction RECORD;
  v_current_balance int;
  v_model_actor_id uuid;
BEGIN
  -- Lock auction
  SELECT * INTO v_auction
  FROM public.auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  -- Validate auction
  IF v_auction IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction not found');
  END IF;

  IF v_auction.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction is not active');
  END IF;

  IF v_auction.buy_now_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Buy now not available for this auction');
  END IF;

  -- Get model's actor ID
  SELECT a.id INTO v_model_actor_id
  FROM public.actors a
  JOIN public.models m ON m.user_id = a.user_id
  WHERE m.id = v_auction.model_id;

  -- Can't buy own auction
  IF v_model_actor_id = p_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot buy your own auction');
  END IF;

  -- Get buyer balance
  SELECT public.get_actor_coin_balance(p_buyer_id) INTO v_current_balance;

  IF v_current_balance < v_auction.buy_now_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient coins',
      'balance', v_current_balance,
      'required', v_auction.buy_now_price
    );
  END IF;

  -- Deduct from buyer
  PERFORM public.update_actor_coin_balance(p_buyer_id, -v_auction.buy_now_price);

  -- Credit to model
  UPDATE public.models
  SET coin_balance = coin_balance + v_auction.buy_now_price
  WHERE id = v_auction.model_id;

  -- Record buyer transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (
    p_buyer_id,
    -v_auction.buy_now_price,
    'auction_buy_now',
    jsonb_build_object('auction_id', p_auction_id)
  );

  -- Record seller transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (
    v_model_actor_id,
    v_auction.buy_now_price,
    'auction_sale',
    jsonb_build_object('auction_id', p_auction_id, 'buyer_id', p_buyer_id, 'is_buy_now', true)
  );

  -- Create buy now bid record
  INSERT INTO public.auction_bids (auction_id, bidder_id, amount, status, is_buy_now, escrow_amount)
  VALUES (p_auction_id, p_buyer_id, v_auction.buy_now_price, 'won', true, 0);

  -- Refund all other bidders
  PERFORM public.refund_auction_escrows(p_auction_id, p_buyer_id);

  -- Mark all other bids as lost
  UPDATE public.auction_bids
  SET status = 'lost'
  WHERE auction_id = p_auction_id
    AND bidder_id != p_buyer_id
    AND status IN ('active', 'outbid', 'winning');

  -- End auction as sold
  UPDATE public.auctions
  SET status = 'sold',
      winner_id = p_buyer_id,
      current_bid = v_auction.buy_now_price,
      updated_at = now()
  WHERE id = p_auction_id;

  -- Notify winner
  INSERT INTO public.notifications (actor_id, type, title, body, data)
  VALUES (
    p_buyer_id,
    'auction_won',
    'Purchase complete!',
    'You purchased "' || v_auction.title || '" via Buy Now!',
    jsonb_build_object('auction_id', p_auction_id, 'amount', v_auction.buy_now_price)
  );

  -- Notify model
  INSERT INTO public.notifications (actor_id, type, title, body, data)
  VALUES (
    v_model_actor_id,
    'auction_sold',
    'Your auction sold!',
    '"' || v_auction.title || '" was purchased via Buy Now for ' || v_auction.buy_now_price || ' coins!',
    jsonb_build_object('auction_id', p_auction_id, 'amount', v_auction.buy_now_price)
  );

  RETURN jsonb_build_object(
    'success', true,
    'amount', v_auction.buy_now_price,
    'new_balance', v_current_balance - v_auction.buy_now_price
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- END AUCTION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.end_auction(p_auction_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_auction RECORD;
  v_winning_bid RECORD;
  v_model_actor_id uuid;
BEGIN
  -- Lock auction
  SELECT * INTO v_auction
  FROM public.auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  IF v_auction IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction not found');
  END IF;

  IF v_auction.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction is not active');
  END IF;

  -- Get winning bid
  SELECT * INTO v_winning_bid
  FROM public.auction_bids
  WHERE auction_id = p_auction_id AND status = 'winning'
  ORDER BY amount DESC
  LIMIT 1;

  -- Get model's actor ID
  SELECT a.id INTO v_model_actor_id
  FROM public.actors a
  JOIN public.models m ON m.user_id = a.user_id
  WHERE m.id = v_auction.model_id;

  IF v_winning_bid IS NOT NULL AND
     (v_auction.reserve_price IS NULL OR v_winning_bid.amount >= v_auction.reserve_price) THEN
    -- Auction sold!

    -- Transfer escrow to model
    UPDATE public.models
    SET coin_balance = coin_balance + v_winning_bid.escrow_amount
    WHERE id = v_auction.model_id;

    -- Record sale transaction
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
    VALUES (
      v_model_actor_id,
      v_winning_bid.escrow_amount,
      'auction_sale',
      jsonb_build_object('auction_id', p_auction_id, 'winner_id', v_winning_bid.bidder_id)
    );

    -- Update winning bid
    UPDATE public.auction_bids
    SET status = 'won',
        escrow_amount = 0,
        escrow_released_at = now()
    WHERE id = v_winning_bid.id;

    -- Mark other bids as lost
    UPDATE public.auction_bids
    SET status = 'lost'
    WHERE auction_id = p_auction_id
      AND id != v_winning_bid.id
      AND status IN ('active', 'outbid');

    -- Refund other bidders
    PERFORM public.refund_auction_escrows(p_auction_id, v_winning_bid.bidder_id);

    -- Update auction
    UPDATE public.auctions
    SET status = 'sold',
        winner_id = v_winning_bid.bidder_id,
        updated_at = now()
    WHERE id = p_auction_id;

    -- Notify winner
    INSERT INTO public.notifications (actor_id, type, title, body, data)
    VALUES (
      v_winning_bid.bidder_id,
      'auction_won',
      'You won the auction!',
      'Congratulations! You won "' || v_auction.title || '" with a bid of ' || v_winning_bid.amount || ' coins!',
      jsonb_build_object('auction_id', p_auction_id, 'amount', v_winning_bid.amount)
    );

    -- Notify model
    INSERT INTO public.notifications (actor_id, type, title, body, data)
    VALUES (
      v_model_actor_id,
      'auction_sold',
      'Your auction sold!',
      '"' || v_auction.title || '" sold for ' || v_winning_bid.amount || ' coins!',
      jsonb_build_object('auction_id', p_auction_id, 'amount', v_winning_bid.amount)
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'sold',
      'winner_id', v_winning_bid.bidder_id,
      'amount', v_winning_bid.amount
    );
  ELSE
    -- No sale (reserve not met or no bids)

    -- Refund all bidders
    PERFORM public.refund_auction_escrows(p_auction_id, NULL);

    -- Mark all bids as lost
    UPDATE public.auction_bids
    SET status = 'lost'
    WHERE auction_id = p_auction_id AND status IN ('active', 'outbid', 'winning');

    -- Update auction
    UPDATE public.auctions
    SET status = 'no_sale',
        updated_at = now()
    WHERE id = p_auction_id;

    -- Notify model
    INSERT INTO public.notifications (actor_id, type, title, body, data)
    VALUES (
      v_model_actor_id,
      'auction_no_sale',
      'Auction ended without sale',
      '"' || v_auction.title || '" did not meet the reserve price.',
      jsonb_build_object('auction_id', p_auction_id)
    );

    RETURN jsonb_build_object('success', true, 'status', 'no_sale');
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Auto-end expired auctions
-- ============================================
-- Note: This is for reference. In production, use a cron job to call end_auction()
-- for auctions where ends_at < now() AND status = 'active'
