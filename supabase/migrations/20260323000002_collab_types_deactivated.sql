-- Add collab_types array and deactivated flag to models
ALTER TABLE models
  ADD COLUMN IF NOT EXISTS collab_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deactivated  BOOLEAN DEFAULT false;

-- Index for finding deactivated models (to exclude from public queries)
CREATE INDEX IF NOT EXISTS idx_models_deactivated ON models(deactivated) WHERE deactivated = true;
