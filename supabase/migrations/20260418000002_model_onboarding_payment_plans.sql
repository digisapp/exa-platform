-- Add payment plan support to model onboarding bookings
ALTER TABLE model_onboarding_bookings
  ADD COLUMN IF NOT EXISTS payment_plan TEXT NOT NULL DEFAULT 'full' CHECK (payment_plan IN ('full', 'split')),
  ADD COLUMN IF NOT EXISTS payments_completed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Allow 'partial' status for split payment plans
ALTER TABLE model_onboarding_bookings DROP CONSTRAINT IF EXISTS model_onboarding_bookings_status_check;
ALTER TABLE model_onboarding_bookings ADD CONSTRAINT model_onboarding_bookings_status_check
  CHECK (status IN ('pending', 'partial', 'paid'));

-- Index for subscription webhook lookups
CREATE INDEX IF NOT EXISTS idx_model_onboarding_stripe_subscription
  ON model_onboarding_bookings(stripe_subscription_id);
