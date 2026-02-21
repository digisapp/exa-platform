-- Add social media follower counts to models table
-- Manually entered by models; used for filtering, sorting, and brand discovery

ALTER TABLE models
  ADD COLUMN IF NOT EXISTS instagram_followers  INTEGER,
  ADD COLUMN IF NOT EXISTS tiktok_followers     INTEGER,
  ADD COLUMN IF NOT EXISTS youtube_subscribers  INTEGER,
  ADD COLUMN IF NOT EXISTS x_followers          INTEGER,
  ADD COLUMN IF NOT EXISTS snapchat_followers   INTEGER;

-- Indexes for follower-based sorting and filtering on approved models
CREATE INDEX IF NOT EXISTS idx_models_instagram_followers ON models(instagram_followers DESC NULLS LAST) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_models_tiktok_followers    ON models(tiktok_followers DESC NULLS LAST)    WHERE is_approved = true;
