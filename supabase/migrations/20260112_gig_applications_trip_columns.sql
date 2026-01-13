-- Add trip-specific columns to gig_applications for content trips
ALTER TABLE gig_applications
ADD COLUMN IF NOT EXISTS trip_number INTEGER,
ADD COLUMN IF NOT EXISTS spot_type TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS amount_paid INTEGER,
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS instagram_followers INTEGER,
ADD COLUMN IF NOT EXISTS digis_username TEXT,
ADD COLUMN IF NOT EXISTS sponsorship_pitch TEXT;

-- Create index for trip queries
CREATE INDEX IF NOT EXISTS idx_gig_applications_trip_number ON gig_applications(trip_number) WHERE trip_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gig_applications_spot_type ON gig_applications(spot_type) WHERE spot_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gig_applications_payment_status ON gig_applications(payment_status) WHERE payment_status IS NOT NULL;
