-- Applicant-chase nudge log — dedup for /api/cron/applicant-chase, which
-- nudges pending model applicants who stalled before confirming their email
-- or uploading a profile photo.
--
-- Claim-then-send: the cron INSERTs a row BEFORE sending each email; the
-- UNIQUE constraint turns any retry / overlapping run into a 23505
-- unique-violation the route treats as "already sent" (chat_nudges_sent /
-- digest_sends pattern).
--
-- The CHECK constraint doubles as the hard "max 2 emails per applicant,
-- ever" guardrail: only two nudge_type values exist and
-- (application_id, nudge_type) is UNIQUE, so a third chase email is
-- structurally impossible regardless of route bugs.
--
-- Unclaimed-imports safety: model_applications.user_id is NOT NULL
-- REFERENCES auth.users (00007_model_applications.sql), so this table — and
-- the chase cron — can never touch the ~5k unclaimed imported `models` rows
-- (those have models.user_id IS NULL and no application at all).

CREATE TABLE IF NOT EXISTS public.application_nudges_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.model_applications(id) ON DELETE CASCADE,
  nudge_type TEXT NOT NULL CHECK (nudge_type IN ('finish_1', 'finish_2')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One nudge of each type per application (the idempotency gate; per-app
  -- lookups ride this index's application_id prefix)
  UNIQUE (application_id, nudge_type)
);

ALTER TABLE public.application_nudges_sent ENABLE ROW LEVEL SECURITY;

-- Service-role only: the cron writes via the service client; nothing
-- user-facing reads this table.
CREATE POLICY "Service role only" ON public.application_nudges_sent
  FOR ALL USING (false);
