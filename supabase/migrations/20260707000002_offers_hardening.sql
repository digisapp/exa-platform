-- Offers hardening (follow-up to PR #71 offers audit)
--
-- 1. Allow 'daily' recurrence: the API and cron already support it, but the
--    CHECK constraint from 00041 still rejects it, so creating a daily
--    recurring offer 500s at insert.
-- 2. Rewrite accept_offer_spot to be fully safe: verify the response belongs
--    to the offer, make it idempotent for already-accepted responses (a
--    double-submit must not double-increment spots_filled), and pin
--    search_path.
-- 3. Lock down the offer RPCs. They are SECURITY DEFINER and were never
--    included in the RPC lockdown migrations (20260611000001 /
--    20260612000001), so any authenticated user could call
--    increment/decrement_offer_spots_filled on ANY offer (blocking real
--    accepts or reopening full offers) or accept_offer_spot with arbitrary
--    ids. All call sites use the service-role client.
-- 4. Tighten offer_responses RLS. Models could INSERT a response row for any
--    offer (self-invite: the row then grants SELECT on the offer via the
--    00045 policy and passes the respond route's invitation check), and
--    UPDATE their own rows without restriction (set status='confirmed',
--    fake checked_in_at to inflate reliability_score, accept full/expired
--    offers). All legitimate writes go through service-role API routes;
--    models only ever read their responses client-side.

-- 1. Daily recurrence
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_recurrence_pattern_check;
ALTER TABLE offers ADD CONSTRAINT offers_recurrence_pattern_check
  CHECK (recurrence_pattern IS NULL OR recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly'));

-- 2. Safe atomic accept
CREATE OR REPLACE FUNCTION public.accept_offer_spot(
  p_offer_id uuid,
  p_response_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_offer RECORD;
  v_response RECORD;
BEGIN
  -- Lock the offer row to serialize concurrent accepts
  SELECT * INTO v_offer
  FROM public.offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF v_offer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer not found');
  END IF;

  SELECT * INTO v_response
  FROM public.offer_responses
  WHERE id = p_response_id AND offer_id = p_offer_id
  FOR UPDATE;

  IF v_response IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Response not found');
  END IF;

  -- Idempotent: an already-accepted response holds its spot, no increment
  IF v_response.status IN ('accepted', 'confirmed') THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_accepted', true,
      'spots_filled', v_offer.spots_filled,
      'total_spots', v_offer.spots
    );
  END IF;

  IF v_offer.spots_filled >= v_offer.spots THEN
    RETURN jsonb_build_object('success', false, 'error', 'All spots have been filled');
  END IF;

  UPDATE public.offers
  SET spots_filled = spots_filled + 1
  WHERE id = p_offer_id;

  UPDATE public.offer_responses
  SET status = 'accepted', responded_at = now()
  WHERE id = p_response_id;

  RETURN jsonb_build_object(
    'success', true,
    'spots_filled', v_offer.spots_filled + 1,
    'total_spots', v_offer.spots
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Service-role-only offer RPCs (same pattern as 20260611000001)
REVOKE EXECUTE ON FUNCTION public.increment_offer_spots_filled(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_offer_spots_filled(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_offer_spot(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_offer_spots_filled(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_offer_spots_filled(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_offer_spot(uuid, uuid) TO service_role;

-- 4. offer_responses: models read their own rows; all writes are service-role
DROP POLICY IF EXISTS "Models can insert own responses" ON offer_responses;
DROP POLICY IF EXISTS "Models can update own responses" ON offer_responses;
