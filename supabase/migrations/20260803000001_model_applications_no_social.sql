-- Model applications: allow applicants with no public social account.
--
-- Until now the signup form hard-required an Instagram OR TikTok handle. In 642
-- applications since 2026-04-01, exactly 0 came through on TikTok alone — the
-- "alternative" never functioned as one, so in practice the form was
-- Instagram-or-nothing. Models who are new, private, or agency-managed had no
-- path in.
--
-- Both handle fields are now optional and this flag is DERIVED server-side when
-- an application arrives with neither (see /api/auth/model-signup). It is not
-- something the applicant declares: the reviewer's next action is the same
-- whether a handle is absent or merely withheld, so asking would have bought
-- nothing but another field to get wrong.
ALTER TABLE public.model_applications
  ADD COLUMN IF NOT EXISTS no_social boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.model_applications.no_social IS
  'Derived at signup: application arrived with neither Instagram nor TikTok. Review on photos.';

-- Partial index: the admin queue triages these separately.
CREATE INDEX IF NOT EXISTS idx_model_applications_no_social
  ON public.model_applications(created_at DESC)
  WHERE no_social = true;
