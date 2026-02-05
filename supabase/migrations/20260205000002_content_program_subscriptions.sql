-- =============================================
-- CONTENT PROGRAM SUBSCRIPTION SUPPORT
-- Adds Stripe subscription fields and allows direct enrollment without application
-- =============================================

-- Make application_id optional (allow direct signups without application)
ALTER TABLE content_program_enrollments
  ALTER COLUMN application_id DROP NOT NULL;

-- Add contact and Stripe fields to enrollments
ALTER TABLE content_program_enrollments
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Remove the commitment_months default (now month-to-month)
ALTER TABLE content_program_enrollments
  ALTER COLUMN commitment_months DROP DEFAULT;

-- Index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_cp_enrollments_stripe_session
  ON content_program_enrollments(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_cp_enrollments_stripe_subscription
  ON content_program_enrollments(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_cp_enrollments_stripe_customer
  ON content_program_enrollments(stripe_customer_id);

-- Add policy for public enrollment insert (for direct checkout)
CREATE POLICY "Public can create pending enrollments"
  ON content_program_enrollments FOR INSERT
  WITH CHECK (status = 'pending');
