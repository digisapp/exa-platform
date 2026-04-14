-- Live Wall enhancements: pinned messages, profile links, image/GIF support

-- Pinned messages (only one at a time)
ALTER TABLE public.live_wall_messages
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_live_wall_one_pinned
  ON public.live_wall_messages (is_pinned)
  WHERE is_pinned = true AND is_deleted = false;

-- Profile links (denormalized slug for linking to profiles)
ALTER TABLE public.live_wall_messages
  ADD COLUMN IF NOT EXISTS profile_slug TEXT;

-- Image/GIF support
ALTER TABLE public.live_wall_messages
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_type TEXT;

ALTER TABLE public.live_wall_messages
  ADD CONSTRAINT live_wall_image_type_check
  CHECK (image_type IS NULL OR image_type IN ('upload', 'gif'));

-- Update content constraint: allow empty content when image is present
ALTER TABLE public.live_wall_messages
  DROP CONSTRAINT IF EXISTS live_wall_messages_content_check;

ALTER TABLE public.live_wall_messages
  ADD CONSTRAINT live_wall_content_or_image
  CHECK (char_length(content) >= 1 OR image_url IS NOT NULL);
