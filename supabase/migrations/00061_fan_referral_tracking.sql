-- ============================================
-- FAN REFERRAL TRACKING
-- Track which model profile a fan came from when signing up
-- ============================================

-- Add referred_by_model_id to fans table
ALTER TABLE public.fans
ADD COLUMN IF NOT EXISTS referred_by_model_id uuid REFERENCES public.models(id) ON DELETE SET NULL;

-- Index for querying referrals by model
CREATE INDEX IF NOT EXISTS idx_fans_referred_by ON public.fans(referred_by_model_id)
WHERE referred_by_model_id IS NOT NULL;
