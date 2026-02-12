-- Studio Booking Feature
-- Models can book free 1-hour time slots in EXA's physical studio space

-- Studio slots: available time blocks set by admin
CREATE TABLE studio_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date, start_time)
);

-- Studio bookings: model reservations for slots
CREATE TABLE studio_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES studio_slots(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(slot_id)
);

-- Indexes
CREATE INDEX idx_studio_slots_date ON studio_slots(date);
CREATE INDEX idx_studio_bookings_model_id ON studio_bookings(model_id);
CREATE INDEX idx_studio_bookings_status ON studio_bookings(status);
CREATE INDEX idx_studio_bookings_slot_id ON studio_bookings(slot_id);

-- Enable RLS
ALTER TABLE studio_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for studio_slots
-- Anyone authenticated can read slots
CREATE POLICY "Anyone can read studio slots"
  ON studio_slots FOR SELECT
  TO authenticated
  USING (true);

-- Only admin (via service role) manages slots - no insert/update/delete policies for regular users

-- RLS Policies for studio_bookings
-- Models can read their own bookings
CREATE POLICY "Models can read own studio bookings"
  ON studio_bookings FOR SELECT
  TO authenticated
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Models can insert their own bookings
CREATE POLICY "Models can insert own studio bookings"
  ON studio_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Models can update (cancel) their own bookings
CREATE POLICY "Models can update own studio bookings"
  ON studio_bookings FOR UPDATE
  TO authenticated
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_studio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger for studio_slots
CREATE TRIGGER set_studio_slots_updated_at
  BEFORE UPDATE ON studio_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_studio_updated_at();

-- Updated_at trigger for studio_bookings
CREATE TRIGGER set_studio_bookings_updated_at
  BEFORE UPDATE ON studio_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_studio_updated_at();
