-- Weekly digest send log (idempotency for /api/cron/weekly-digest)
--
-- The weekly re-engagement digest cron claims a row here BEFORE sending each
-- email (insert, then send). A unique index on (recipient_id, digest_key)
-- turns any cron retry / overlapping run into a unique-violation, which the
-- route treats as "already sent" — the same claim-then-send pattern as
-- chat_nudges_sent (20260406000001).
--
-- recipient_id is an actors.id for fans (fans.id == actors.id) and a
-- models.id for models. It deliberately has NO foreign key: it must be able
-- to point at either table, and the log should survive account soft-deletes
-- for audit purposes.
--
-- digest_key encodes audience + ISO week, e.g. 'fan-2026-W28' /
-- 'model-2026-W28', so one row = one recipient x one weekly issue.

CREATE TABLE IF NOT EXISTS public.digest_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('fan', 'model')),
  recipient_id UUID NOT NULL,
  digest_key TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One digest per recipient per issue (the idempotency gate)
CREATE UNIQUE INDEX IF NOT EXISTS idx_digest_sends_recipient_key
  ON public.digest_sends(recipient_id, digest_key);

-- Fast "who already got this issue" prefetch
CREATE INDEX IF NOT EXISTS idx_digest_sends_key
  ON public.digest_sends(digest_key);

ALTER TABLE public.digest_sends ENABLE ROW LEVEL SECURITY;

-- Service-role only (the cron writes via the service client; nothing
-- user-facing reads this table)
CREATE POLICY "Service role only" ON public.digest_sends
  FOR ALL USING (false);
