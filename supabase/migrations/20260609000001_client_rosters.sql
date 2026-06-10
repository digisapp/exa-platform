-- Client rosters: admin-curated, publicly shareable model lineups for external clients (no account needed).
-- A roster is reached via an unguessable share_token. Permanent until revoked (revoked_at set) or expired (expires_at).
-- Public reads are served by the service-role client, so RLS stays locked down (no anon/authenticated policies).

CREATE TABLE IF NOT EXISTS public.model_rosters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token  text NOT NULL UNIQUE,
  title        text NOT NULL,
  client_name  text,
  note         text,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  view_count   integer NOT NULL DEFAULT 0,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.roster_models (
  roster_id  uuid NOT NULL REFERENCES public.model_rosters(id) ON DELETE CASCADE,
  model_id   uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  position   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (roster_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_roster_models_roster ON public.roster_models(roster_id);
CREATE INDEX IF NOT EXISTS idx_model_rosters_created_by ON public.model_rosters(created_by);

-- Atomic view counter for the public page (best-effort, called via RPC).
CREATE OR REPLACE FUNCTION public.increment_roster_view(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.model_rosters SET view_count = view_count + 1 WHERE share_token = p_token;
$$;

-- Lock down: only the service role (which bypasses RLS) may read/write. Enabling RLS with no
-- permissive policies blocks all anon/authenticated direct access.
ALTER TABLE public.model_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_models ENABLE ROW LEVEL SECURITY;
