-- Add full profile fields to comp_card_leads
-- Captures everything the model typed into the free comp card tool

ALTER TABLE public.comp_card_leads
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS height text,
  ADD COLUMN IF NOT EXISTS bust text,
  ADD COLUMN IF NOT EXISTS waist text,
  ADD COLUMN IF NOT EXISTS hips text,
  ADD COLUMN IF NOT EXISTS eye_color text,
  ADD COLUMN IF NOT EXISTS hair_color text,
  ADD COLUMN IF NOT EXISTS dress_size text,
  ADD COLUMN IF NOT EXISTS shoe_size text,
  ADD COLUMN IF NOT EXISTS export_type text; -- 'pdf' | 'jpeg'
