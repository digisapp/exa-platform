-- Replace VIP tier with full_package tier
-- New pricing: $175 Entry, $399 Full Package
-- Keeping old tiers (crown, elite, vip) for any existing entries

ALTER TABLE public.swimcrown_contestants
  DROP CONSTRAINT IF EXISTS swimcrown_contestants_tier_check;

ALTER TABLE public.swimcrown_contestants
  ADD CONSTRAINT swimcrown_contestants_tier_check
  CHECK (tier IN ('standard', 'full_package', 'crown', 'elite', 'vip'));
