-- ============================================
-- Auction Improvements Migration
-- 1. Fix place_auction_bid return values to match API expectations
-- 2. Implement auto-bidding logic
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
  v_is_winning boolean := true;
  v_final_amount int;
  v_new_end_time timestamptz;
  -- Auto-bid variables
  v_auto_amount int;
  v_auto_balance int;
  v_auto_escrow_diff int;
BEGIN
  -- Lock the auction for update
  SELECT * INTO v_auction
  FROM public.auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  -- Validate auction exists
  IF v_auction IS NULL THEN
    RAISE EXCEPTION 'Auction not found';
  END IF;

  -- Validate auction is active
  IF v_auction.status != 'active' THEN
    RAISE EXCEPTION 'Auction is not active';
  END IF;

  -- Validate auction hasn't ended
  IF v_auction.ends_at < now() THEN
    RAISE EXCEPTION 'Auction has ended';
  END IF;

  -- Get model's actor ID to prevent self-bidding
  SELECT a.id INTO v_model_actor_id
  FROM public.actors a
  JOIN public.models m ON m.user_id = a.user_id
  WHERE m.id = v_auction.model_id;

  -- Can't bid on own auction
  IF v_model_actor_id = p_bidder_id THEN
    RAISE EXCEPTION 'Cannot bid on your own auction';
  END IF;

  -- Validate bid amount meets minimum
  IF p_amount < v_auction.starting_price THEN
    RAISE EXCEPTION 'Bid must meet the minimum of % coins', v_auction.starting_price;
  END IF;

  -- Validate bid is higher than current
  IF v_auction.current_bid IS NOT NULL AND v_auction.current_bid > 0 AND p_amount <= v_auction.current_bid THEN
    RAISE EXCEPTION 'Bid must be higher than current bid of % coins', v_auction.current_bid;
  END IF;

  -- Get bidder's current balance
  SELECT public.get_actor_coin_balance(p_bidder_id) INTO v_current_balance;

  -- Check for existing bid (to reuse escrow)
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
    RAISE EXCEPTION 'Insufficient coin balance';
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
  v_final_amount := p_amount;

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

    SELECT ends_at INTO v_new_end_time
    FROM public.auctions WHERE id = p_auction_id;
  END IF;

  -- ============================================
  -- AUTO-BIDDING: Counter-bid for outbid bidder
  -- ============================================
  IF v_auction.allow_auto_bid
     AND v_current_high_bid IS NOT NULL
     AND v_current_high_bid.bidder_id != p_bidder_id
     AND v_current_high_bid.max_auto_bid IS NOT NULL
     AND v_current_high_bid.max_auto_bid > p_amount THEN

    -- Calculate auto-bid: current bid + increment, capped at max_auto_bid
    v_auto_amount := LEAST(p_amount + 10, v_current_high_bid.max_auto_bid);

    IF v_auto_amount > p_amount THEN
      -- Check if outbid bidder has enough balance for additional escrow
      v_auto_balance := public.get_actor_coin_balance(v_current_high_bid.bidder_id);
      v_auto_escrow_diff := v_auto_amount - COALESCE(v_current_high_bid.escrow_amount, 0);

      IF v_auto_escrow_diff <= 0 OR v_auto_balance >= v_auto_escrow_diff THEN
        -- Deduct additional escrow if needed
        IF v_auto_escrow_diff > 0 THEN
          PERFORM public.update_actor_coin_balance(v_current_high_bid.bidder_id, -v_auto_escrow_diff);

          INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
          VALUES (
            v_current_high_bid.bidder_id,
            -v_auto_escrow_diff,
            'auction_escrow',
            jsonb_build_object('auction_id', p_auction_id, 'bid_amount', v_auto_amount, 'auto_bid', true)
          );
        END IF;

        -- Restore outbid bidder's bid to winning with new amount
        UPDATE public.auction_bids
        SET amount = v_auto_amount,
            status = 'winning',
            escrow_amount = v_auto_amount
        WHERE id = v_current_high_bid.id;

        -- Mark the new bidder's bid as outbid
        UPDATE public.auction_bids
        SET status = 'outbid'
        WHERE id = v_bid_id;

        -- Update auction current bid to auto-bid amount
        UPDATE public.auctions
        SET current_bid = v_auto_amount,
            updated_at = now()
        WHERE id = p_auction_id;

        v_final_amount := v_auto_amount;
        v_is_winning := false;

        -- Notify the new bidder they were outbid by auto-bid
        INSERT INTO public.notifications (actor_id, type, title, body, data)
        VALUES (
          p_bidder_id,
          'auction_outbid',
          'Outbid by auto-bid!',
          'An auto-bid of ' || v_auto_amount || ' coins was placed on "' || v_auction.title || '"',
          jsonb_build_object('auction_id', p_auction_id, 'new_amount', v_auto_amount, 'auto_bid', true)
        );
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bid_id', v_bid_id,
    'final_amount', v_final_amount,
    'escrow_deducted', v_escrow_needed,
    'is_winning', v_is_winning,
    'auction_extended', v_anti_snipe_extended,
    'new_end_time', v_new_end_time
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
