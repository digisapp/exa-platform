-- Flyers table for storing generated model flyers per event
CREATE TABLE IF NOT EXISTS public.flyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,           -- path in Supabase Storage (portfolio bucket)
  public_url TEXT NOT NULL,             -- full public URL to the flyer image
  width INT NOT NULL DEFAULT 1080,
  height INT NOT NULL DEFAULT 1350,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (model_id, event_id)           -- one flyer per model per event
);

-- Index for listing flyers by event
CREATE INDEX idx_flyers_event_id ON public.flyers(event_id);

-- RLS
ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;

-- Anyone can view flyers (they're promotional material)
CREATE POLICY "Anyone can view flyers"
  ON public.flyers FOR SELECT TO public USING (true);

-- Only service role inserts/updates/deletes (admin API routes)
CREATE POLICY "Service role manages flyers"
  ON public.flyers FOR ALL TO service_role USING (true) WITH CHECK (true);
