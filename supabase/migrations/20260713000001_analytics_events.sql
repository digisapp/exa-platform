-- Generic product-analytics events (funnel steps that page_views can't express,
-- e.g. taps on the locked social chips that may not convert to a signup).
-- Written ONLY by the service role via /api/analytics/event; no client grants.
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  model_id uuid REFERENCES public.models(id) ON DELETE SET NULL,
  visitor_id text,
  session_id text,
  user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: service-role-only reads/writes (same posture as the
-- money RPCs). Admin dashboards go through service-role API routes.

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created
  ON public.analytics_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_model
  ON public.analytics_events(model_id) WHERE model_id IS NOT NULL;
