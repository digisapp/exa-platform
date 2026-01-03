-- Add subscription management fields to brands table
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS coins_granted_at TIMESTAMPTZ;

-- Drop old constraint if it exists (subscription_tier was limited to only 'free')
ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_subscription_tier_check;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brands_stripe_customer_id ON brands(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_brands_subscription_status ON brands(subscription_status);

-- Update existing brands to have proper subscription_tier
UPDATE brands SET subscription_tier = 'free' WHERE subscription_tier IS NULL OR subscription_tier = '';
UPDATE brands SET subscription_status = 'none' WHERE subscription_status IS NULL;
