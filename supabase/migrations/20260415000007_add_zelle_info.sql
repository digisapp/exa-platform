-- Add Zelle payout info to models
-- Stores email or phone number used for Zelle transfers

ALTER TABLE public.models ADD COLUMN IF NOT EXISTS zelle_info TEXT;

COMMENT ON COLUMN public.models.zelle_info IS 'Zelle email or phone number for payouts';
