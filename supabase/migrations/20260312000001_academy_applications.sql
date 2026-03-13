-- Academy applications table for EXA Beauty Academy
-- Stores applications and enrollments for cohort-based beauty training programs

CREATE TABLE IF NOT EXISTS academy_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cohort info
  cohort text NOT NULL CHECK (cohort IN ('miami-swim-week', 'nyfw', 'art-basel')),
  cohort_year int NOT NULL DEFAULT EXTRACT(YEAR FROM now()),

  -- Applicant info
  applicant_name text NOT NULL,
  applicant_email text NOT NULL,
  applicant_phone text,
  applicant_instagram text,
  applicant_city text,
  applicant_state text,
  experience_level text NOT NULL CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
  motivation text,

  -- Payment
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  payment_type text DEFAULT 'full' CHECK (payment_type IN ('full', 'installment')),
  price_cents int NOT NULL DEFAULT 199500,
  installments_total int DEFAULT 1,
  installments_paid int DEFAULT 0,
  stripe_customer_id text,

  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'enrolled', 'completed', 'cancelled', 'refunded')),

  -- Timestamps
  applied_at timestamptz DEFAULT now(),
  enrolled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_academy_applications_email ON academy_applications(applicant_email);
CREATE INDEX idx_academy_applications_cohort ON academy_applications(cohort, cohort_year);
CREATE INDEX idx_academy_applications_status ON academy_applications(status);
CREATE INDEX idx_academy_applications_stripe ON academy_applications(stripe_checkout_session_id);

-- RLS
ALTER TABLE academy_applications ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for webhooks and admin)
CREATE POLICY "Service role full access" ON academy_applications
  FOR ALL
  USING (true)
  WITH CHECK (true);
