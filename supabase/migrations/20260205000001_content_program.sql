-- =============================================
-- SWIMWEAR CONTENT PROGRAM
-- For designer partnerships leading up to Miami Swim Week
-- $500/month for 3 months, credits toward $3,000 Swim Week package
-- =============================================

-- Designer/Brand Applications
CREATE TABLE IF NOT EXISTS content_program_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact info
  brand_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Brand info
  website_url TEXT,
  instagram_handle TEXT,
  tiktok_handle TEXT,

  -- Collection details
  collection_name TEXT,
  collection_description TEXT,
  collection_pieces_count INTEGER,
  target_audience TEXT,

  -- Optional: link to existing user account
  user_id UUID REFERENCES auth.users(id),

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- New application
    'reviewing',    -- Under review
    'approved',     -- Approved, awaiting enrollment
    'rejected',     -- Not accepted
    'enrolled'      -- Converted to active enrollment
  )),

  -- Admin fields
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES actors(id),
  admin_notes TEXT,
  rejection_reason TEXT,

  -- Source tracking
  source TEXT DEFAULT 'website',
  source_detail TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active Program Enrollments
CREATE TABLE IF NOT EXISTS content_program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to application
  application_id UUID NOT NULL REFERENCES content_program_applications(id),

  -- Brand info (denormalized for convenience)
  brand_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,

  -- Program details
  start_date DATE NOT NULL,
  commitment_months INTEGER DEFAULT 3,
  monthly_rate DECIMAL(10,2) DEFAULT 500.00,

  -- Swim Week tracking
  swim_week_package_cost DECIMAL(10,2) DEFAULT 3000.00,
  swim_week_target_date DATE DEFAULT '2026-05-26',

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active',       -- Currently enrolled
    'paused',       -- Temporarily paused
    'completed',    -- Finished commitment
    'cancelled',    -- Cancelled early
    'swim_week'     -- Converted to Swim Week package
  )),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Tracking
CREATE TABLE IF NOT EXISTS content_program_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  enrollment_id UUID NOT NULL REFERENCES content_program_enrollments(id),

  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  payment_month INTEGER NOT NULL, -- 1, 2, 3, etc.
  due_date DATE NOT NULL,

  -- Payment status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Not yet due
    'due',          -- Currently due
    'paid',         -- Payment received
    'overdue',      -- Past due
    'waived'        -- Fee waived
  )),

  -- Payment info
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,

  -- Credits toward Swim Week
  credits_toward_swim_week DECIMAL(10,2) DEFAULT 500.00,

  -- Admin fields
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deliverables tracking
CREATE TABLE IF NOT EXISTS content_program_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  enrollment_id UUID NOT NULL REFERENCES content_program_enrollments(id),
  payment_id UUID REFERENCES content_program_payments(id),

  -- Month this deliverable is for
  delivery_month INTEGER NOT NULL,

  -- Content counts
  video_clips_count INTEGER DEFAULT 0,
  video_clips_required INTEGER DEFAULT 10,
  photos_count INTEGER DEFAULT 0,
  photos_required INTEGER DEFAULT 50,

  -- Delivery status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Not started
    'in_progress',  -- Shooting/editing
    'delivered',    -- Content delivered
    'approved'      -- Client approved
  )),

  delivery_date DATE,
  delivery_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Program notes (similar to CRM call_notes)
CREATE TABLE IF NOT EXISTS content_program_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Can be linked to application, enrollment, or both
  application_id UUID REFERENCES content_program_applications(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES content_program_enrollments(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN (
    'general',
    'call_notes',
    'delivery_notes',
    'payment_notes',
    'internal'
  )),

  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cp_applications_status ON content_program_applications(status);
CREATE INDEX IF NOT EXISTS idx_cp_applications_email ON content_program_applications(email);
CREATE INDEX IF NOT EXISTS idx_cp_applications_created ON content_program_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cp_enrollments_status ON content_program_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_cp_enrollments_application ON content_program_enrollments(application_id);
CREATE INDEX IF NOT EXISTS idx_cp_payments_enrollment ON content_program_payments(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_cp_payments_status ON content_program_payments(status);
CREATE INDEX IF NOT EXISTS idx_cp_payments_due_date ON content_program_payments(due_date);

-- RLS Policies
ALTER TABLE content_program_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_program_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_program_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_program_notes ENABLE ROW LEVEL SECURITY;

-- Public can submit applications (no auth required)
CREATE POLICY "Anyone can submit applications"
  ON content_program_applications FOR INSERT
  WITH CHECK (true);

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
  ON content_program_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Admins full access to all tables
CREATE POLICY "Admins full access applications"
  ON content_program_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

CREATE POLICY "Admins full access enrollments"
  ON content_program_enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

CREATE POLICY "Admins full access payments"
  ON content_program_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

CREATE POLICY "Admins full access deliverables"
  ON content_program_deliverables FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

CREATE POLICY "Admins full access notes"
  ON content_program_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );
