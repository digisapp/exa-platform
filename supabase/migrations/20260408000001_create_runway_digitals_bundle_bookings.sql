-- Table to track model onboarding bookings (Runway Workshop + Swimwear Digitals)
CREATE TABLE IF NOT EXISTS model_onboarding_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  instagram TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 55000,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for webhook lookups
CREATE INDEX idx_model_onboarding_stripe_session
  ON model_onboarding_bookings(stripe_session_id);

-- RLS: admin-only access (service role bypasses)
ALTER TABLE model_onboarding_bookings ENABLE ROW LEVEL SECURITY;
