-- Manual call availability, decoupled from the on-site heartbeat.
--
-- video_is_online only reflects an open EXA tab (offline-models cron flips it
-- off ~2 min after the last heartbeat), so fans could never ring a model who
-- wasn't literally on the site — the incoming-call email/SMS/push existed but
-- sat behind an "is the tab open" gate. available_for_calls is a model-
-- controlled flag: reachable = video_is_online OR available_for_calls.
--
-- Writes go through /api/model/availability (service role) only — the
-- dashboard pill and the settings toggle both call that route.
ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS available_for_calls boolean NOT NULL DEFAULT false;

-- Partial index for future "who is callable right now" discovery surfaces;
-- tiny because opt-in models are the minority.
CREATE INDEX IF NOT EXISTS idx_models_available_for_calls
  ON public.models (available_for_calls)
  WHERE available_for_calls = true;
