-- =============================================
-- AVAILABILITY SLOTS TABLE FOR CALL BOOKING
-- =============================================

-- Table for admin-defined available time slots
CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  booked_by UUID REFERENCES call_requests(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, start_time)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability_slots(date);
CREATE INDEX IF NOT EXISTS idx_availability_available ON availability_slots(date, is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_availability_booked ON availability_slots(booked_by) WHERE booked_by IS NOT NULL;

-- Enable RLS
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view available slots" ON availability_slots;
DROP POLICY IF EXISTS "Admins can manage availability" ON availability_slots;

-- RLS Policies
-- Public can read available slots (for booking calendar)
CREATE POLICY "Anyone can view available slots"
  ON availability_slots FOR SELECT
  USING (true);

-- Only admins can create/update/delete slots
CREATE POLICY "Admins can manage availability"
  ON availability_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS availability_slots_updated_at ON availability_slots;
CREATE TRIGGER availability_slots_updated_at
  BEFORE UPDATE ON availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_availability_updated_at();
