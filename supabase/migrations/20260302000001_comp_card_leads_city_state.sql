-- Add city and state to comp_card_leads
ALTER TABLE public.comp_card_leads
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;
