-- Brand collaboration fields for models
-- Lets models advertise their social stats and sponsored post rates
-- Lets brands filter by models open to collabs

ALTER TABLE models
  ADD COLUMN IF NOT EXISTS open_to_collabs        BOOLEAN  DEFAULT false,
  ADD COLUMN IF NOT EXISTS avg_instagram_impressions INTEGER,
  ADD COLUMN IF NOT EXISTS avg_tiktok_views        INTEGER,
  ADD COLUMN IF NOT EXISTS instagram_collab_rate   INTEGER, -- USD flat rate per sponsored post
  ADD COLUMN IF NOT EXISTS tiktok_collab_rate      INTEGER; -- USD flat rate per sponsored TikTok

-- Deliverables field on brand offers (e.g. "1 Reel + 2 Stories")
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS deliverables TEXT;

-- Index for filtering models open to collabs
CREATE INDEX IF NOT EXISTS idx_models_open_to_collabs ON models(open_to_collabs) WHERE open_to_collabs = true;
