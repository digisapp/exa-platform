-- Model lifecycle nudge log — dedup for /api/cron/stalled-new-models (day-3 /
-- day-10 profile-completion reminders) and the weekly digest's getting-started
-- variant (which suppresses itself when a lifecycle nudge fired recently).
--
-- Claim-then-send: the cron INSERTs a row BEFORE sending each email; the
-- UNIQUE constraint turns any retry / overlapping run into a 23505
-- unique-violation the route treats as "already sent" — same pattern as
-- chat_nudges_sent (20260406000001) and digest_sends (20260712100005).
--
-- model_id is models.id and deliberately has NO foreign key (digest_sends
-- precedent): the send log must survive account soft-deletes for audit.
--
-- nudge_key values today: 'profile_d3', 'profile_d10'. Deliberately NO CHECK
-- constraint so future lifecycle keys don't need an ALTER (lesson from
-- 20260715000001_model_reply_nudge_type: extending a CHECK requires a
-- migration every time).

CREATE TABLE IF NOT EXISTS public.model_lifecycle_nudges_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL,
  nudge_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One nudge of each kind per model, ever (the idempotency gate)
  UNIQUE (model_id, nudge_key)
);

-- Prefetch by key ("who already got profile_d3"); per-model lookups ride the
-- UNIQUE index's (model_id, ...) prefix.
CREATE INDEX IF NOT EXISTS idx_model_lifecycle_nudges_key
  ON public.model_lifecycle_nudges_sent(nudge_key);

ALTER TABLE public.model_lifecycle_nudges_sent ENABLE ROW LEVEL SECURITY;

-- Service-role only: crons write via the service client; nothing user-facing
-- reads this table.
CREATE POLICY "Service role only" ON public.model_lifecycle_nudges_sent
  FOR ALL USING (false);
