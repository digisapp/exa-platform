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

-- 5. Add username and phone to brands table
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS phone TEXT;

-- 6. Create index for brand username lookups
CREATE INDEX IF NOT EXISTS idx_brands_username ON public.brands(username);

-- 7. Add RLS policies for brands to update their own profile
DROP POLICY IF EXISTS "Brands can update own profile" ON public.brands;
CREATE POLICY "Brands can update own profile" ON public.brands
  FOR UPDATE USING (id = (SELECT id FROM public.actors WHERE user_id = auth.uid()));
