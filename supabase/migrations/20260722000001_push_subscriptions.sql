-- Web push subscriptions: one row per browser endpoint. An actor can hold
-- several (phone PWA, laptop Chrome, etc.). Written ONLY by the service role
-- via /api/push/subscribe and /api/push/unsubscribe — no client write
-- policies, same posture as content_likes. lib/push.ts prunes rows inline
-- when the push service answers 404/410 (dead subscription).

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  -- Push endpoints are long opaque URLs — TEXT, never varchar(n)
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sendPushToActor fans out by actor
CREATE INDEX idx_push_subscriptions_actor ON public.push_subscriptions(actor_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Reads: own rows only (lets a device show "push is on here").
-- Writes: service-role only — the API routes enforce auth, Zod validation
-- and rate limiting; a session-client write must silently no-op.
-- ============================================================
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Actors view own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (actor_id = (SELECT id FROM public.actors WHERE user_id = auth.uid()));

CREATE POLICY "Service role bypass push subscriptions"
  ON public.push_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
