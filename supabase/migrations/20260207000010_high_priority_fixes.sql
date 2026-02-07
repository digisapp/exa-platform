-- High Priority Payment/Financial Fixes
-- 1. Prevent shill bidding (auction owner bidding on their own auction) at the database level

-- Create function to prevent shill bidding
CREATE OR REPLACE FUNCTION public.prevent_shill_bidding()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.auctions
    WHERE id = NEW.auction_id AND created_by = NEW.bidder_id
  ) THEN
    RAISE EXCEPTION 'Cannot bid on your own auction';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it already exists, then create it
DROP TRIGGER IF EXISTS check_shill_bidding ON public.auction_bids;
CREATE TRIGGER check_shill_bidding
  BEFORE INSERT ON public.auction_bids
  FOR EACH ROW EXECUTE FUNCTION public.prevent_shill_bidding();
