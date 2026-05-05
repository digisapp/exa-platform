-- Model availability for specific gig dates (e.g. Miami Swim Week May 26-31)
CREATE TABLE IF NOT EXISTS public.gig_availability (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id      UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  model_id    UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (gig_id, model_id, available_date)
);

CREATE INDEX idx_gig_availability_gig ON public.gig_availability(gig_id);
CREATE INDEX idx_gig_availability_model ON public.gig_availability(model_id);

ALTER TABLE public.gig_availability ENABLE ROW LEVEL SECURITY;

-- Models can read and manage their own availability
CREATE POLICY "Models manage own availability"
  ON public.gig_availability
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = gig_availability.model_id
        AND models.user_id = auth.uid()
    )
  );

-- Admins can read all availability
CREATE POLICY "Admins read all availability"
  ON public.gig_availability
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
        AND actors.type = 'admin'
    )
  );
