-- Soft delete support for account deletion
-- Models get deleted_at/deleted_reason instead of hard delete
-- Auto-purge cron removes personal data after 90 days

-- Add soft delete columns to models
ALTER TABLE models ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE models ADD COLUMN IF NOT EXISTS deleted_reason TEXT DEFAULT NULL;
ALTER TABLE models ADD COLUMN IF NOT EXISTS purged_at TIMESTAMPTZ DEFAULT NULL;

-- Add deactivation column to actors
ALTER TABLE actors ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient filtering of active models
CREATE INDEX IF NOT EXISTS idx_models_not_deleted ON models (is_approved) WHERE deleted_at IS NULL;

-- Index for purge cron job
CREATE INDEX IF NOT EXISTS idx_models_pending_purge ON models (deleted_at) WHERE deleted_at IS NOT NULL AND purged_at IS NULL;

COMMENT ON COLUMN models.deleted_at IS 'When the model initiated account deletion (soft delete)';
COMMENT ON COLUMN models.deleted_reason IS 'Optional reason provided for account deletion';
COMMENT ON COLUMN models.purged_at IS 'When personal data was permanently purged (90 days after deletion)';
COMMENT ON COLUMN actors.deactivated_at IS 'When the actor account was deactivated';
