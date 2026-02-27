-- Fix prevent_shill_bidding trigger: auctions.created_by does not exist.
-- The correct check is model_id (uuid of models row) joined through to actors.
-- The RPC function already does this check, but fix the trigger for DB-level safety.

CREATE OR REPLACE FUNCTION public.prevent_shill_bidding()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.auctions a
    JOIN public.models m ON m.id = a.model_id
    JOIN public.actors act ON act.user_id = m.user_id
    WHERE a.id = NEW.auction_id
      AND act.id = NEW.bidder_id
  ) THEN
    RAISE EXCEPTION 'Cannot bid on your own auction';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
