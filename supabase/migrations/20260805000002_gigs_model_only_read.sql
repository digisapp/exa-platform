-- Gigs go members-only (2026-08-05, reverses the PR #73 public-funnel decision).
--
-- The old SELECT policy exposed every open gig — titles, dates, and pay — to
-- the anon PostgREST role, so walling the /gigs pages alone would still leave
-- the data one curl away. Owner decision: castings are for signed-in models
-- only.
--
-- Carve-out: tour stops (type='tour') and travel trips (type='travel') power
-- the public /tour and /travel pages (incl. no-account designer/media applies)
-- and stay world-readable.
--
-- Side effects, all intended:
--   * /events/[slug] casting sections render through the visitor's session, so
--     they now auto-hide for anon/fans and appear only for models/admins.
--   * The homepage upcoming-events carousel (visitor session) only shows
--     tour/travel stops to non-models.
-- Admin reads keep working via the existing "Admins can manage opportunities"
-- ALL policy; admin dashboards and crons use the service role anyway.

DROP POLICY IF EXISTS "Public opportunities viewable by everyone" ON public.gigs;

CREATE POLICY "Tour and travel stops viewable by everyone" ON public.gigs
  FOR SELECT
  USING (
    type IN ('tour', 'travel')
    AND (visibility = 'public' OR status = 'open')
  );

CREATE POLICY "Models can view gigs" ON public.gigs
  FOR SELECT
  TO authenticated
  USING (
    (visibility = 'public' OR status = 'open')
    AND EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = auth.uid()
        AND a.type = 'model'
    )
  );
