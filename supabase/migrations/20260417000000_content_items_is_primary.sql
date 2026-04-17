-- Add is_primary flag to content_items so models can choose their hero portrait
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- Only one primary photo per model
CREATE UNIQUE INDEX IF NOT EXISTS content_items_one_primary_per_model
  ON content_items (model_id) WHERE is_primary = true;
