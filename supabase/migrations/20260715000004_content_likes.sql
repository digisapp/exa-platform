-- Content likes: fans (any actor) can heart content items in the For You feed.
-- like_count on content_items is trigger-maintained (same convention as
-- gigs.spots_filled) so feed/studio reads never need a COUNT.

-- ============================================================
-- 1. TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_likes (
  content_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (content_id, actor_id)
);

-- "my likes" lookups (feed hydration filters by actor + content ids)
CREATE INDEX idx_content_likes_actor ON public.content_likes(actor_id, created_at DESC);

-- ============================================================
-- 2. DENORMALIZED COUNT + TRIGGER
-- ============================================================
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.maintain_content_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.content_items SET like_count = like_count + 1 WHERE id = NEW.content_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.content_items SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.content_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER content_likes_maintain_count
  AFTER INSERT OR DELETE ON public.content_likes
  FOR EACH ROW EXECUTE FUNCTION public.maintain_content_like_count();

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- Reads: actors see their own likes (feed "liked" state). Counts come from
-- content_items.like_count, so no cross-actor read policy is needed.
-- Writes: service-role only — all writes flow through /api/content/like,
-- which enforces auth, rate limiting, and suspension checks.
-- ============================================================
ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Actors view own content likes"
  ON public.content_likes FOR SELECT
  TO authenticated
  USING (actor_id = (SELECT id FROM public.actors WHERE user_id = auth.uid()));

CREATE POLICY "Service role bypass content likes"
  ON public.content_likes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
