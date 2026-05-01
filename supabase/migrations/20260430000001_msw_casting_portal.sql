-- MSW Casting Portal
-- Adds brand_id link on event_show_designers and per-brand private casting picks.
-- Confirmed model pool is derived from existing model_badges (event badge holders) — no separate table needed.

ALTER TABLE public.event_show_designers
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_event_show_designers_brand_id ON public.event_show_designers(brand_id);

-- Each brand's private wishlist of models they want for their show
CREATE TABLE IF NOT EXISTS public.msw_casting_picks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id    UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  model_id    UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, model_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_msw_casting_picks_brand ON public.msw_casting_picks(brand_id, event_id);

ALTER TABLE public.msw_casting_picks ENABLE ROW LEVEL SECURITY;

-- Brands can read their own picks only
CREATE POLICY "brands_read_own_picks" ON public.msw_casting_picks
  FOR SELECT USING (
    brand_id = (
      SELECT id FROM public.actors WHERE user_id = auth.uid() AND type = 'brand' LIMIT 1
    )
  );

CREATE POLICY "brands_insert_own_picks" ON public.msw_casting_picks
  FOR INSERT WITH CHECK (
    brand_id = (
      SELECT id FROM public.actors WHERE user_id = auth.uid() AND type = 'brand' LIMIT 1
    )
  );

CREATE POLICY "brands_delete_own_picks" ON public.msw_casting_picks
  FOR DELETE USING (
    brand_id = (
      SELECT id FROM public.actors WHERE user_id = auth.uid() AND type = 'brand' LIMIT 1
    )
  );
