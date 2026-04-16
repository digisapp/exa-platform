-- ============================================
-- CONTENT ITEM DIMENSIONS
-- Adds width + height to content_items so the profile-page hero can
-- pick a high-res, portrait-orientation portfolio photo as a fallback
-- when the model's profile_photo_url is too low-res to render sharply
-- at hero size (~700px wide on desktop).
--
-- IMPORTANT: this is for the HERO surface only. Circles everywhere
-- (chats, DMs, leaderboards, dashboards, etc.) continue to use
-- profile_photo_url. They are sharp at small sizes and unaffected.
-- ============================================

ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS width INT,
  ADD COLUMN IF NOT EXISTS height INT;

-- Partial index to make hero-portrait lookups cheap:
-- "give me high-res portrait images for this model"
CREATE INDEX IF NOT EXISTS idx_content_items_hero_eligible
  ON public.content_items (model_id, height DESC)
  WHERE media_type = 'image'
    AND status = 'portfolio'
    AND width IS NOT NULL
    AND height IS NOT NULL;
