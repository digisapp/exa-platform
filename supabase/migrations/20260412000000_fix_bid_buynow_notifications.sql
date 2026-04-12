-- ============================================
-- FIX: place_auction_bid & buy_now_auction RPCs failing on notification INSERTs
-- ============================================
-- Same root cause as end_auction (fixed in 20260411220000): the
-- public.notifications table schema changed (actor_id→user_id,
-- body→message, text→enum notification_type). These two functions
-- still INSERT with the old schema, causing silent failures.
--
-- place_auction_bid: outbid notification insert fails → entire bid
-- reverts, bidder sees generic error.
--
-- buy_now_auction: notification inserts fail AFTER coins are
-- transferred → EXCEPTION handler returns {success:false} but the
-- coin transfer already committed, creating an inconsistent state.
--
-- Fix: remove the broken notification inserts from both functions.
-- ============================================

-- ============================================
-- place_auction_bid — remove outbid notification INSERT
-- ============================================
CREATE OR REPLACE FUNCTION public.place_auction_bid(
  p_auction_id uuid, p_bidder_id uuid, p_amount int, p_max_auto_bid int DEFAULT NULL
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
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF v_auction IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Auction not found'); END IF;
  IF v_auction.status != 'active' THEN RETURN jsonb_build_object('success', false, 'error', 'Auction is not active'); END IF;
  IF v_auction.ends_at < now() THEN RETURN jsonb_build_object('success', false, 'error', 'Auction has ended'); END IF;

  SELECT a.id INTO v_model_actor_id FROM public.actors a JOIN public.models m ON m.user_id = a.user_id WHERE m.id = v_auction.model_id;
  IF v_model_actor_id = p_bidder_id THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot bid on your own auction'); END IF;
  IF p_amount < v_auction.starting_price THEN RETURN jsonb_build_object('success', false, 'error', 'Bid must be at least ' || v_auction.starting_price || ' coins'); END IF;
  IF v_auction.current_bid IS NOT NULL AND v_auction.current_bid > 0 AND p_amount <= v_auction.current_bid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bid must be higher than ' || v_auction.current_bid || ' coins');
  END IF;

  SELECT public.get_actor_coin_balance(p_bidder_id) INTO v_current_balance;
  SELECT * INTO v_existing_bid FROM public.auction_bids WHERE auction_id = p_auction_id AND bidder_id = p_bidder_id AND status IN ('active', 'outbid', 'winning') FOR UPDATE;
  v_escrow_needed := p_amount - COALESCE(v_existing_bid.escrow_amount, 0);
  IF v_current_balance < v_escrow_needed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient coins', 'balance', v_current_balance, 'required', v_escrow_needed);
  END IF;

  SELECT * INTO v_current_high_bid FROM public.auction_bids WHERE auction_id = p_auction_id AND status = 'winning' LIMIT 1;
  IF v_current_high_bid IS NOT NULL AND v_current_high_bid.bidder_id != p_bidder_id THEN
    UPDATE public.auction_bids SET status = 'outbid' WHERE id = v_current_high_bid.id;
    -- Notification removed: old schema (actor_id/body/enum) no longer matches live table
  END IF;

  IF v_escrow_needed > 0 THEN
    PERFORM public.update_actor_coin_balance(p_bidder_id, -v_escrow_needed);
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata) VALUES (
      p_bidder_id, -v_escrow_needed, 'auction_escrow',
      jsonb_build_object('auction_id', p_auction_id, 'bid_amount', p_amount));
  END IF;

  IF v_existing_bid IS NOT NULL THEN
    UPDATE public.auction_bids SET amount = p_amount, max_auto_bid = COALESCE(p_max_auto_bid, max_auto_bid), status = 'winning', escrow_amount = p_amount WHERE id = v_existing_bid.id RETURNING id INTO v_bid_id;
  ELSE
    INSERT INTO public.auction_bids (auction_id, bidder_id, amount, max_auto_bid, status, escrow_amount)
    VALUES (p_auction_id, p_bidder_id, p_amount, p_max_auto_bid, 'winning', p_amount) RETURNING id INTO v_bid_id;
  END IF;

  UPDATE public.auctions SET current_bid = p_amount, bid_count = CASE WHEN v_existing_bid IS NULL THEN bid_count + 1 ELSE bid_count END, updated_at = now() WHERE id = p_auction_id;

  IF v_auction.anti_snipe_minutes > 0 AND v_auction.ends_at - now() < (v_auction.anti_snipe_minutes || ' minutes')::interval THEN
    UPDATE public.auctions SET ends_at = now() + (v_auction.anti_snipe_minutes || ' minutes')::interval WHERE id = p_auction_id;
    v_anti_snipe_extended := true;
  END IF;

  RETURN jsonb_build_object('success', true, 'bid_id', v_bid_id, 'amount', p_amount, 'escrow_deducted', v_escrow_needed, 'new_balance', v_current_balance - v_escrow_needed, 'extended', v_anti_snipe_extended);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- buy_now_auction — remove sold/won notification INSERTs
-- ============================================
CREATE OR REPLACE FUNCTION public.buy_now_auction(p_auction_id uuid, p_buyer_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_auction RECORD;
  v_current_balance int;
  v_model_actor_id uuid;
BEGIN
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF v_auction IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Auction not found'); END IF;
  IF v_auction.status != 'active' THEN RETURN jsonb_build_object('success', false, 'error', 'Auction is not active'); END IF;
  IF v_auction.buy_now_price IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Buy now not available'); END IF;

  SELECT a.id INTO v_model_actor_id FROM public.actors a JOIN public.models m ON m.user_id = a.user_id WHERE m.id = v_auction.model_id;
  IF v_model_actor_id = p_buyer_id THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot buy your own auction'); END IF;

  SELECT public.get_actor_coin_balance(p_buyer_id) INTO v_current_balance;
  IF v_current_balance < v_auction.buy_now_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient coins', 'balance', v_current_balance, 'required', v_auction.buy_now_price);
  END IF;

  PERFORM public.update_actor_coin_balance(p_buyer_id, -v_auction.buy_now_price);
  UPDATE public.models SET coin_balance = coin_balance + v_auction.buy_now_price WHERE id = v_auction.model_id;
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata) VALUES (p_buyer_id, -v_auction.buy_now_price, 'auction_buy_now', jsonb_build_object('auction_id', p_auction_id));
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata) VALUES (v_model_actor_id, v_auction.buy_now_price, 'auction_sale', jsonb_build_object('auction_id', p_auction_id, 'buyer_id', p_buyer_id, 'is_buy_now', true));
  INSERT INTO public.auction_bids (auction_id, bidder_id, amount, status, is_buy_now, escrow_amount) VALUES (p_auction_id, p_buyer_id, v_auction.buy_now_price, 'won', true, 0);
  PERFORM public.refund_auction_escrows(p_auction_id, p_buyer_id);
  UPDATE public.auction_bids SET status = 'lost' WHERE auction_id = p_auction_id AND bidder_id != p_buyer_id AND status IN ('active', 'outbid', 'winning');
  UPDATE public.auctions SET status = 'sold', winner_id = p_buyer_id, current_bid = v_auction.buy_now_price, updated_at = now() WHERE id = p_auction_id;

  -- Notifications removed: old schema (actor_id/body/enum) no longer matches live table
  -- Email notifications for sold/won are sent by the application layer

  RETURN jsonb_build_object('success', true, 'amount', v_auction.buy_now_price, 'new_balance', v_current_balance - v_auction.buy_now_price);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
