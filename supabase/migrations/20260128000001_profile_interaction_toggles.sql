-- Add profile interaction toggle columns to models table
-- These allow models to control which interaction buttons appear on their public profile

ALTER TABLE models
ADD COLUMN IF NOT EXISTS allow_chat BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_video_call BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_voice_call BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_tips BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN models.allow_chat IS 'Whether to show the Chat button on the public profile';
COMMENT ON COLUMN models.allow_video_call IS 'Whether to show the Video Call button on the public profile';
COMMENT ON COLUMN models.allow_voice_call IS 'Whether to show the Voice Call button on the public profile';
COMMENT ON COLUMN models.allow_tips IS 'Whether to show the Tip button on the public profile';
