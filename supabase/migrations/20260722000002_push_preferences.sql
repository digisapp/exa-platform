-- Per-actor push notification preferences. One row per actor; NO row means
-- "everything enabled" — lib/push.ts treats a missing row as default-on, so
-- rows only exist once someone flips a toggle in Settings.
--
-- Event vocabulary is FIXED at calls / messages / earnings / offers
-- (src/lib/push-config.ts is the TypeScript source of truth). Adding an event
-- key requires a migration adding the matching BOOLEAN column (default true).
--
-- Written ONLY by the service role via /api/push/preferences.

CREATE TABLE IF NOT EXISTS public.push_preferences (
  actor_id UUID PRIMARY KEY REFERENCES public.actors(id) ON DELETE CASCADE,
  calls BOOLEAN NOT NULL DEFAULT true,
  messages BOOLEAN NOT NULL DEFAULT true,
  earnings BOOLEAN NOT NULL DEFAULT true,
  offers BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Reads: own row only (Settings GET). Writes: service-role only.
-- ============================================================
ALTER TABLE public.push_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Actors view own push preferences"
  ON public.push_preferences FOR SELECT
  TO authenticated
  USING (actor_id = (SELECT id FROM public.actors WHERE user_id = auth.uid()));

CREATE POLICY "Service role bypass push preferences"
  ON public.push_preferences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
