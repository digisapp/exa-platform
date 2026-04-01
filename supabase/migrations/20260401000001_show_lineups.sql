-- Show Lineups: assign models to designers for fashion show events
-- Supports multiple designers per event, walk order per model, and models in multiple lineups

-- Designer lineups within an event
CREATE TABLE public.show_lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  designer_id UUID NOT NULL REFERENCES public.designers(id) ON DELETE CASCADE,
  gig_id UUID REFERENCES public.gigs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  show_date DATE,
  show_time TIME,
  show_order INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, designer_id)
);

-- Models assigned to a lineup with walk order
CREATE TABLE public.show_lineup_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lineup_id UUID NOT NULL REFERENCES public.show_lineups(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  walk_order INT NOT NULL DEFAULT 0,
  outfit_notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'standby', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lineup_id, model_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_show_lineups_event ON public.show_lineups(event_id);
CREATE INDEX idx_show_lineups_designer ON public.show_lineups(designer_id);
CREATE INDEX idx_show_lineup_models_lineup ON public.show_lineup_models(lineup_id);
CREATE INDEX idx_show_lineup_models_model ON public.show_lineup_models(model_id);
CREATE INDEX idx_show_lineup_models_order ON public.show_lineup_models(lineup_id, walk_order);

-- RLS
ALTER TABLE public.show_lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_lineup_models ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage show lineups" ON public.show_lineups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

CREATE POLICY "Admins can manage lineup models" ON public.show_lineup_models
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- Service role bypass (for API routes using service client)
CREATE POLICY "Service role full access to show_lineups" ON public.show_lineups
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to show_lineup_models" ON public.show_lineup_models
  FOR ALL USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_show_lineups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_show_lineups_updated_at
  BEFORE UPDATE ON public.show_lineups
  FOR EACH ROW EXECUTE FUNCTION update_show_lineups_updated_at();
