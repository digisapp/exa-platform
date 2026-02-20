-- Add stored CPM columns and engagement rate to models table
-- CPM is stored (not computed) so it can be filtered/sorted efficiently
-- Updated by the application whenever model saves collab settings

ALTER TABLE models
  ADD COLUMN IF NOT EXISTS instagram_cpm           NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS tiktok_cpm              NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS instagram_engagement_rate NUMERIC(5,2);

-- Index for CPM-based sorting/filtering on collab-enabled models
CREATE INDEX IF NOT EXISTS idx_models_instagram_cpm ON models(instagram_cpm) WHERE open_to_collabs = true;
CREATE INDEX IF NOT EXISTS idx_models_tiktok_cpm    ON models(tiktok_cpm)    WHERE open_to_collabs = true;
