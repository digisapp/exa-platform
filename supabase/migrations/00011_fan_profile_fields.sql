-- ============================================
-- ADD PROFILE FIELDS TO FANS TABLE
-- ============================================

-- Add profile columns to fans
ALTER TABLE public.fans
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS username_changed_at timestamptz;

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_fans_username ON public.fans(username);
