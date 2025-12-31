-- ============================================
-- FIX SCHEMA ISSUES
-- ============================================

-- 1. Fix actors type constraint to include 'fan'
ALTER TABLE public.actors DROP CONSTRAINT IF EXISTS actors_type_check;
ALTER TABLE public.actors ADD CONSTRAINT actors_type_check
  CHECK (type IN ('model', 'brand', 'admin', 'fan'));

-- 2. Add user_id to models table (referenced by code but missing)
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Backfill user_id for existing models from their actor records
UPDATE public.models m
SET user_id = a.user_id
FROM public.actors a
WHERE m.id = a.id
AND m.user_id IS NULL;

-- 4. Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_models_user_id ON public.models(user_id);
