-- Make gigs.spots_filled self-maintaining and drift-proof.
--
-- Background: spots_filled (count of ACCEPTED applications for a gig) was kept in
-- sync by hand via increment_gig_spots_filled / decrement_gig_spots_filled RPCs
-- called from /api/admin/gig-applications/[id]. Two problems:
--   1. A SECOND route, /api/admin/applications/[id], also flips application status
--      to accepted/rejected but never touched spots_filled -> guaranteed drift.
--   2. A failed/renamed RPC left the counter permanently wrong (hence the manual
--      scripts audit-msw-spots.ts + fix-msw-spots-filled.ts).
--
-- Fix: a single AFTER trigger recomputes spots_filled from the authoritative
-- accepted-application count on every insert/update/delete of gig_applications.
-- This is the single source of truth and catches ALL code paths, so the manual
-- ±1 RPC calls are removed from the route (keeping them would double-count).

-- Recompute helper (absolute count -> immune to the ±1 drift class).
CREATE OR REPLACE FUNCTION public.recompute_gig_spots_filled(p_gig_id uuid)
RETURNS void AS $$
BEGIN
  IF p_gig_id IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.gigs g
  SET spots_filled = (
    SELECT count(*)
    FROM public.gig_applications ga
    WHERE ga.gig_id = p_gig_id
      AND ga.status = 'accepted'
  )
  WHERE g.id = p_gig_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_gig_spots_filled()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recompute_gig_spots_filled(COALESCE(NEW.gig_id, OLD.gig_id));
  -- Defensive: if an application were ever moved between gigs, fix both.
  IF TG_OP = 'UPDATE' AND NEW.gig_id IS DISTINCT FROM OLD.gig_id THEN
    PERFORM public.recompute_gig_spots_filled(OLD.gig_id);
  END IF;
  RETURN NULL; -- AFTER trigger, return value ignored
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_gig_spots_filled ON public.gig_applications;
CREATE TRIGGER trg_sync_gig_spots_filled
AFTER INSERT OR UPDATE OR DELETE ON public.gig_applications
FOR EACH ROW EXECUTE FUNCTION public.sync_gig_spots_filled();

-- One-time backfill: correct any existing drift right now.
UPDATE public.gigs g
SET spots_filled = COALESCE((
  SELECT count(*)
  FROM public.gig_applications ga
  WHERE ga.gig_id = g.id
    AND ga.status = 'accepted'
), 0);

-- Note: increment_gig_spots_filled / decrement_gig_spots_filled (00039) are now
-- superseded by this trigger and are no longer called. Left in place to avoid a
-- breaking drop; safe to remove in a later cleanup once types are regenerated.
