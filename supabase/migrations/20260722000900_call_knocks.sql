-- Call knocks: a fan taps Call on an unreachable model and "knocks" instead
-- of hitting dead air — the model gets ONE alert (email + push) that a fan
-- is trying to call RIGHT NOW, and the fan is enrolled to be pinged the
-- moment the model becomes reachable again (video_is_online heartbeat OR
-- the available_for_calls toggle). Turns the old "Not taking calls right
-- now" dead end into a demand signal for model activation.
--
-- One row per (fan, model): re-knocking refreshes created_at and re-arms
-- the fan's online alert (fan_notified_at back to NULL). knocked=false rows
-- are watch-only ("notify me when they're online") and never alert the model.
--
-- Dedup happens at read time, not in the schema: the model alert checks
-- MAX(model_notified_at) across ALL of the model's rows (many fans inside
-- the window collapse into one alert), and the online pass claims pending
-- rows atomically (UPDATE ... WHERE fan_notified_at IS NULL) so overlapping
-- heartbeats can't double-send.
--
-- Writes are service-role-only via /api/calls/knock and the
-- flip-to-reachable hooks in /api/activity and /api/model/availability.

CREATE TABLE IF NOT EXISTS public.call_knocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- fans.id == actors.id, so this doubles as the push/ledger actor id
  fan_id UUID NOT NULL REFERENCES public.fans(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL DEFAULT 'video' CHECK (call_type IN ('video', 'voice')),
  knocked BOOLEAN NOT NULL DEFAULT true,
  model_notified_at TIMESTAMPTZ,
  fan_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_call_knocks_fan_model
  ON public.call_knocks(fan_id, model_id);

-- The flip-to-reachable pass: "pending watchers for this model"
CREATE INDEX IF NOT EXISTS idx_call_knocks_model_pending
  ON public.call_knocks(model_id) WHERE fan_notified_at IS NULL;

ALTER TABLE public.call_knocks ENABLE ROW LEVEL SECURITY;

-- Service-role only (same convention as digest_sends / chat_nudges_sent)
CREATE POLICY "Service role only" ON public.call_knocks
  FOR ALL USING (false);
