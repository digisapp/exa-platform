-- Admin rating drives feed ordering: 5★ superstars first, 1-2★ buried last.
--
-- rating_tier is a generated column so PostgREST .order() can sort by it
-- directly. Unrated models are deliberately NEUTRAL (tier 3, same as 3★):
-- most of the roster is unrated, and treating unrated as bottom would empty
-- the feeds until every model is hand-rated. Admin only needs to rate the
-- extremes — star up the superstars, star down the brand risks.
--
-- admin_rating itself predates the migration chain (added out-of-band), so
-- guard it for shadow-DB replays.
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS admin_rating integer;

ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS rating_tier smallint
  GENERATED ALWAYS AS (COALESCE(admin_rating, 3)) STORED;

COMMENT ON COLUMN public.models.rating_tier IS
  'Feed-ordering tier derived from admin_rating (unrated = 3). Order-by only: never expose in fan/model-facing payloads.';

-- Matches the explore-grid ordering (rating_tier DESC, last_active_at DESC).
CREATE INDEX IF NOT EXISTS idx_models_rating_tier_active
  ON public.models (rating_tier DESC, last_active_at DESC NULLS LAST);
