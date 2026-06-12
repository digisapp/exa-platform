-- Email-ownership confirmation for model applications
-- Migration: 20260612000006_application_email_confirmation.sql
--
-- Signup auto-confirms at the Supabase auth level to keep sign-in instant,
-- which means auth.users.email_confirmed_at proves nothing about ownership.
-- Track confirmation on the application itself instead: the application-received
-- email carries a tokenized confirm link, and admin approval requires
-- email_confirmed_at to be set. Fully decoupled from the auth sign-in flow.

ALTER TABLE public.model_applications
  ADD COLUMN IF NOT EXISTS email_confirm_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS model_applications_email_confirm_token_idx
  ON public.model_applications (email_confirm_token);

-- Grandfather every application that predates this feature: those applicants
-- never received a confirm link, and blocking their approval would strand them.
UPDATE public.model_applications
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;

COMMENT ON COLUMN public.model_applications.email_confirm_token IS
  'Unguessable token embedded in the application-received email; clicking it sets email_confirmed_at.';
COMMENT ON COLUMN public.model_applications.email_confirmed_at IS
  'When the applicant proved ownership of their email. Required for admin approval. Backfilled for pre-feature applications.';
