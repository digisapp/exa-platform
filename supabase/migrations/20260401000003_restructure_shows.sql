-- Restructure: Event → Shows → Designers → Models
-- Drop old tables and recreate with proper hierarchy

-- Drop old tables (cascade drops show_lineup_models too)
DROP TABLE IF EXISTS public.show_lineup_models CASCADE;
DROP TABLE IF EXISTS public.show_lineups CASCADE;

-- 1. Shows: a time slot within an event (e.g. "Opening Night", "Daytime Show")
CREATE TABLE public.event_shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  show_date DATE,
  show_time TIME,
  show_order INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Designers within a show
CREATE TABLE public.event_show_designers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES public.event_shows(id) ON DELETE CASCADE,
  designer_name TEXT NOT NULL,
  designer_order INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (show_id, designer_name)
);

-- 3. Models assigned to a designer within a show
CREATE TABLE public.event_show_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_entry_id UUID NOT NULL REFERENCES public.event_show_designers(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  walk_order INT NOT NULL DEFAULT 0,
  outfit_notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'standby', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (designer_entry_id, model_id)
);

-- Indexes
CREATE INDEX idx_event_shows_event ON public.event_shows(event_id);
CREATE INDEX idx_event_show_designers_show ON public.event_show_designers(show_id);
CREATE INDEX idx_event_show_models_designer ON public.event_show_models(designer_entry_id);
CREATE INDEX idx_event_show_models_model ON public.event_show_models(model_id);
CREATE INDEX idx_event_show_models_order ON public.event_show_models(designer_entry_id, walk_order);

-- RLS
ALTER TABLE public.event_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_show_designers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_show_models ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can manage event shows" ON public.event_shows
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.actors WHERE actors.user_id = auth.uid() AND actors.type = 'admin')
  );
CREATE POLICY "Admins can manage show designers" ON public.event_show_designers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.actors WHERE actors.user_id = auth.uid() AND actors.type = 'admin')
  );
CREATE POLICY "Admins can manage show models" ON public.event_show_models
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.actors WHERE actors.user_id = auth.uid() AND actors.type = 'admin')
  );

-- Service role bypass
CREATE POLICY "Service role full access to event_shows" ON public.event_shows
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to event_show_designers" ON public.event_show_designers
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to event_show_models" ON public.event_show_models
  FOR ALL USING (auth.role() = 'service_role');

-- Updated_at trigger for event_shows
CREATE OR REPLACE FUNCTION update_event_shows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_event_shows_updated_at
  BEFORE UPDATE ON public.event_shows
  FOR EACH ROW EXECUTE FUNCTION update_event_shows_updated_at();
