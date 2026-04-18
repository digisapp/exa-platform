-- Saved flyer design templates
CREATE TABLE IF NOT EXISTS public.flyer_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  settings JSONB NOT NULL,          -- full FlyerDesignSettings object
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.flyer_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view flyer templates"
  ON public.flyer_templates FOR SELECT TO public USING (true);

CREATE POLICY "Service role manages flyer templates"
  ON public.flyer_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
