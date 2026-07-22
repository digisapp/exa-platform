-- Offer-expiry reminders: nudge models about UNANSWERED offers before they
-- lapse. Migration: 20260722000850_offer_expiry_reminders.sql
--
-- Today the offer-reminders cron only reminds models about ALREADY
-- confirmed/accepted responses 24-48h before event_date (dedup column:
-- offer_responses.reminder_sent_at). A pending (never-answered) offer gets
-- no nudge and silently vanishes from the dashboard once past-dated.
--
-- 1. expiry_reminder_sent_at — dedup for the new "respond before it closes"
--    pass in /api/cron/offer-reminders. DELIBERATELY a separate column from
--    reminder_sent_at: that one is owned by the confirmed-event reminder,
--    and sharing it would suppress the later event reminder for a model who
--    accepts after being nudged. The cron only ever sets this timestamp —
--    it never touches status/responded_at, so the valid_response_timestamp
--    CHECK (20260207000012: status='pending' => responded_at IS NULL) can
--    never be violated by this pass.
ALTER TABLE public.offer_responses
  ADD COLUMN IF NOT EXISTS expiry_reminder_sent_at TIMESTAMPTZ;

-- Partial index for the cron's scan: pending responses not yet nudged.
CREATE INDEX IF NOT EXISTS idx_offer_responses_expiry_pending
  ON public.offer_responses (status, expiry_reminder_sent_at)
  WHERE status = 'pending';

-- 2. Bell notification enum value. notifications.type is a strict Postgres
--    ENUM (notification_type) — inserting an out-of-enum value errors, and
--    the app insert paths log-and-continue, so the row silently never lands
--    (the exact failure 20260722000800 fixed for money events). No
--    offer-related value exists yet, so add exactly one.
--
--    Same rule as 20260722000800: ALTER TYPE ... ADD VALUE may run inside
--    this migration's transaction on PG 12+, but the new value MUST NOT be
--    referenced by any other statement in this file. App code that inserts
--    'offer_expiring' (the offer-reminders cron) ships separately — apply
--    this migration BEFORE deploying that code.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'offer_expiring';
