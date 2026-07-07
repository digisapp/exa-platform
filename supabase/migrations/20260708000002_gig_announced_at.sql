-- Track when a gig's "new gig" announcement email blast was sent, so reopening
-- or re-publishing a gig (Close -> Reopen, Unpublish -> Publish) does not
-- re-blast all ~600+ approved models. The announce route sets this and refuses
-- to send again unless explicitly forced.

ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS announced_at TIMESTAMPTZ;
