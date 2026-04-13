-- Add 'vip' to the allowed tiers for swimcrown_contestants
-- New pricing: $150 Standard, $250 VIP (replaces old $299/$549/$799 tiers)
-- Keeping 'crown' and 'elite' for any existing entries

ALTER TABLE public.swimcrown_contestants
  DROP CONSTRAINT IF EXISTS swimcrown_contestants_tier_check;

ALTER TABLE public.swimcrown_contestants
  ADD CONSTRAINT swimcrown_contestants_tier_check
  CHECK (tier IN ('standard', 'crown', 'elite', 'vip'));
