-- Add phone column to brands table (was referenced in API but missing from schema)
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS phone text;
