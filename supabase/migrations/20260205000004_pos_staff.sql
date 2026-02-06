-- =============================================
-- POS STAFF MANAGEMENT
-- Staff PINs, roles, and activity logging
-- =============================================

-- Staff table
CREATE TABLE IF NOT EXISTS pos_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name TEXT NOT NULL,
  pin TEXT NOT NULL,

  -- Role and permissions
  role TEXT DEFAULT 'cashier' CHECK (role IN ('cashier', 'manager', 'admin')),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  email TEXT,
  phone TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Activity logs
CREATE TABLE IF NOT EXISTS pos_staff_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES pos_staff(id),
  action TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_staff_pin ON pos_staff(pin) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_pos_staff_logs_staff ON pos_staff_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_pos_staff_logs_time ON pos_staff_logs(timestamp DESC);

-- RLS
ALTER TABLE pos_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_staff_logs ENABLE ROW LEVEL SECURITY;

-- Admin access
CREATE POLICY "Admins full access pos_staff"
  ON pos_staff FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

CREATE POLICY "Admins full access pos_staff_logs"
  ON pos_staff_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- Insert default staff members (PINs should be changed in production)
INSERT INTO pos_staff (name, pin, role) VALUES
  ('Manager', '1234', 'manager'),
  ('Cashier 1', '1111', 'cashier'),
  ('Cashier 2', '2222', 'cashier')
ON CONFLICT DO NOTHING;
