-- Travel trips (type='travel' gigs) use an "upcoming" status to mean
-- "visible but bookings not yet open" — a distinct tier from "open" on the
-- public /travel page. The admin travel form and the public page were both
-- written against this value, but the gigs.status CHECK never allowed it, so
-- every travel-trip create failed at insert (23514) and the public
-- "coming soon" section was structurally always empty.
--
-- Extend the CHECK to include 'upcoming'. Additive only — existing values
-- (draft/open/closed/completed/cancelled) are unaffected.
--
-- NOTE: the table is public.gigs (renamed from opportunities long ago); the
-- constraint kept its original opportunities_* name, so that's what we drop.

ALTER TABLE public.gigs
  DROP CONSTRAINT IF EXISTS opportunities_status_check;

ALTER TABLE public.gigs
  ADD CONSTRAINT opportunities_status_check
  CHECK (status IN ('draft', 'open', 'closed', 'completed', 'cancelled', 'upcoming'));
