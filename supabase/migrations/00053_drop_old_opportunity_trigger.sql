-- Drop old trigger that references non-existent 'opportunities' table
-- The table was renamed to 'gigs' and the trigger is now handled by RPC functions

-- Drop the old trigger (it's on gig_applications, formerly opportunity_applications)
DROP TRIGGER IF EXISTS trigger_update_opportunity_spots ON public.gig_applications;
DROP TRIGGER IF EXISTS trigger_update_opportunity_spots ON public.opportunity_applications;

-- Drop the old function
DROP FUNCTION IF EXISTS public.update_opportunity_spots();
