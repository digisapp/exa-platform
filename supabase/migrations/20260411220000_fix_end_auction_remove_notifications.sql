-- ============================================
-- FIX: end_auction RPC was failing on notification INSERTs
-- ============================================
-- The public.notifications table was rebuilt with a different schema
-- (user_id/message/enum notification_type) than what end_auction was
-- written for (actor_id/body/'auction_sold' etc). Every call to
-- end_auction failed, so the /api/cron/end-auctions cron could never
-- transition expired auctions to 'sold' or 'no_sale', and 0-bid
-- auto-restart never triggered.
--
-- Fix: redefine end_auction without the notification inserts. The cron
-- route already sends email notifications via Resend for sold/won, so
-- users are still notified through the same channel.
-- ============================================

CREATE OR REPLACE FUNCTION public.end_auction(p_auction_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_auction RECORD;
  v_winning_bid RECORD;
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

  -- Get winning bid (if any)
  SELECT * INTO v_winning_bid
  FROM public.auction_bids
  WHERE auction_id = p_auction_id AND status = 'winning'
  ORDER BY amount DESC
  LIMIT 1;

  IF v_winning_bid IS NOT NULL AND
     (v_auction.reserve_price IS NULL OR v_winning_bid.amount >= v_auction.reserve_price) THEN
    -- ============================================
    -- SOLD path
    -- ============================================

    -- Transfer escrow to model
    UPDATE public.models
    SET coin_balance = coin_balance + v_winning_bid.escrow_amount
    WHERE id = v_auction.model_id;

    -- Record sale transaction (uses actors.id of the model)
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
    SELECT a.id, v_winning_bid.escrow_amount, 'auction_sale',
           jsonb_build_object('auction_id', p_auction_id, 'winner_id', v_winning_bid.bidder_id)
    FROM public.actors a
    JOIN public.models m ON m.user_id = a.user_id
    WHERE m.id = v_auction.model_id;

    -- Mark winning bid as won, release escrow
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

    -- Refund losing bidders' escrows
    PERFORM public.refund_auction_escrows(p_auction_id, v_winning_bid.bidder_id);

    -- Mark auction sold
    UPDATE public.auctions
    SET status = 'sold',
        winner_id = v_winning_bid.bidder_id,
        updated_at = now()
    WHERE id = p_auction_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'sold',
      'winner_id', v_winning_bid.bidder_id,
      'amount', v_winning_bid.amount
    );
  ELSE
    -- ============================================
    -- NO SALE path (no bids or reserve not met)
    -- ============================================

    -- Refund all escrows
    PERFORM public.refund_auction_escrows(p_auction_id, NULL);

    -- Mark all bids as lost
    UPDATE public.auction_bids
    SET status = 'lost'
    WHERE auction_id = p_auction_id
      AND status IN ('active', 'outbid', 'winning');

    -- Mark auction as no_sale
    UPDATE public.auctions
    SET status = 'no_sale',
        updated_at = now()
    WHERE id = p_auction_id;

    RETURN jsonb_build_object('success', true, 'status', 'no_sale');
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
