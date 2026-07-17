-- EXA Travel Phase 1
--
-- 1. gigs.require_id_verification — per-trip admin toggle: when true, a model
--    cannot be ACCEPTED to the gig until an admin has completed the manual
--    identity verification flow (models.identity_verified_at, migration
--    20260509000005). Enforced in the admin decision route, not a DB trigger,
--    so the admin gets an actionable error instead of a silent failure.
--
-- 2. gig_applications.confirmed_at — the model's own "I'm coming" confirmation
--    after acceptance. Distinct from status='accepted' (admin's decision).
--    Written only by the service-role /api/trips/confirm route; the model
--    self-update RLS policy (20260716000001) is deliberately pending-only and
--    stays that way.

ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS require_id_verification boolean NOT NULL DEFAULT false;

-- 3. Travel compensation vocabulary. The admin travel form has always offered
--    'hosted' (all-expenses trip) and 'revenue_share', but the legacy
--    opportunities CHECK only allowed paid/tfp/perks/exposure/content/none —
--    so creating a hosted trip failed at the DB. Extend rather than remap:
--    both values are already rendered by the public travel pages.
ALTER TABLE public.gigs DROP CONSTRAINT IF EXISTS opportunities_compensation_type_check;
ALTER TABLE public.gigs
  ADD CONSTRAINT opportunities_compensation_type_check
    CHECK (compensation_type = ANY (ARRAY[
      'paid'::text, 'tfp'::text, 'perks'::text, 'exposure'::text,
      'content'::text, 'none'::text, 'hosted'::text, 'revenue_share'::text
    ]));

COMMENT ON COLUMN public.gigs.require_id_verification IS
  'When true, acceptance is blocked until models.identity_verified_at is set (checked in /api/admin/gig-applications/[id]). Used for travel trips.';

ALTER TABLE public.gig_applications
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

COMMENT ON COLUMN public.gig_applications.confirmed_at IS
  'When the model confirmed their accepted spot (travel trips). Service-role writes only via /api/trips/confirm.';
