-- Model applications: allow applicants with no public social account.
--
-- Until now the signup form hard-required an Instagram OR TikTok handle. In 642
-- applications since 2026-04-01, exactly 0 came through on TikTok alone — the
-- "alternative" never functioned as one, so in practice the form was
-- Instagram-or-nothing. Models who are new, private, or agency-managed had no
-- path in and no way to tell us why.
--
-- The gate moves from the door to the review queue: applicants can now tick
-- "I don't have one yet", and the flag surfaces in /admin/model-applications so
-- the reviewer knows to judge on photos rather than hunting for a handle.
ALTER TABLE public.model_applications
  ADD COLUMN IF NOT EXISTS no_social boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.model_applications.no_social IS
  'Applicant declared they have no public Instagram/TikTok. Review on photos instead of socials.';

-- Partial index: the admin queue filters these out for separate triage.
CREATE INDEX IF NOT EXISTS idx_model_applications_no_social
  ON public.model_applications(created_at DESC)
  WHERE no_social = true;
