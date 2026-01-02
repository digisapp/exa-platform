-- Bookings table for model booking requests
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Booking reference number (human readable)
  booking_number text UNIQUE NOT NULL,

  -- Parties involved
  model_id uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,

  -- Service details
  service_type text NOT NULL CHECK (service_type IN (
    'photoshoot_hourly', 'photoshoot_half_day', 'photoshoot_full_day',
    'promo', 'brand_ambassador', 'private_event', 'social_companion', 'meet_greet', 'other'
  )),
  service_description text, -- Additional details about the service

  -- Date and time
  event_date date NOT NULL,
  start_time time,
  duration_hours numeric(4,1), -- e.g., 2.5 hours

  -- Location
  location_name text, -- e.g., "Studio XYZ" or "Private Residence"
  location_address text,
  location_city text,
  location_state text,
  is_remote boolean DEFAULT false, -- For virtual/remote bookings

  -- Pricing
  quoted_rate integer NOT NULL, -- Original rate from model's profile
  total_amount integer NOT NULL, -- Total booking amount
  deposit_amount integer DEFAULT 0, -- Required deposit
  deposit_paid boolean DEFAULT false,

  -- Status tracking
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Waiting for model response
    'accepted',     -- Model accepted, waiting for deposit/confirmation
    'declined',     -- Model declined
    'counter',      -- Model sent counter offer
    'confirmed',    -- Booking confirmed (deposit paid if required)
    'completed',    -- Event completed
    'cancelled',    -- Cancelled by either party
    'no_show'       -- Client didn't show up
  )),

  -- Counter offer (if model counters)
  counter_amount integer,
  counter_notes text,

  -- Notes
  client_notes text, -- Notes from the person booking
  model_notes text, -- Private notes from model
  model_response_notes text, -- Model's response message

  -- Cancellation
  cancelled_by uuid REFERENCES public.actors(id),
  cancellation_reason text,
  cancelled_at timestamptz,

  -- Timestamps
  responded_at timestamptz, -- When model responded
  confirmed_at timestamptz, -- When booking was confirmed
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Generate booking number function
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS text AS $$
DECLARE
  new_number text;
  exists_check boolean;
BEGIN
  LOOP
    -- Generate format: EXA-XXXXXX (6 alphanumeric chars)
    new_number := 'EXA-' || upper(substr(md5(random()::text), 1, 6));

    -- Check if it exists
    SELECT EXISTS(SELECT 1 FROM public.bookings WHERE booking_number = new_number) INTO exists_check;

    IF NOT exists_check THEN
      RETURN new_number;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate booking number
CREATE OR REPLACE FUNCTION set_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_number IS NULL THEN
    NEW.booking_number := generate_booking_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_number_trigger ON public.bookings;
CREATE TRIGGER booking_number_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_number();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_booking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_updated_at ON public.bookings;
CREATE TRIGGER booking_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_timestamp();

-- Indexes (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_bookings_model_id ON public.bookings(model_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON public.bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);

-- RLS Policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Models can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Models can update their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can update their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;

-- Models can see bookings where they are the model
CREATE POLICY "Models can view their bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = bookings.model_id
      AND models.user_id = auth.uid()
    )
  );

-- Clients can see bookings they created
CREATE POLICY "Clients can view their bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.id = bookings.client_id
      AND actors.user_id = auth.uid()
    )
  );

-- Anyone can create a booking (will be validated in API)
CREATE POLICY "Authenticated users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Models can update bookings (for accepting/declining)
CREATE POLICY "Models can update their bookings" ON public.bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = bookings.model_id
      AND models.user_id = auth.uid()
    )
  );

-- Clients can update their bookings (for cancellation)
CREATE POLICY "Clients can update their bookings" ON public.bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.id = bookings.client_id
      AND actors.user_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all bookings" ON public.bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- Comments
COMMENT ON TABLE public.bookings IS 'Model booking requests and management';
COMMENT ON COLUMN public.bookings.booking_number IS 'Human-readable booking reference (EXA-XXXXXX)';
COMMENT ON COLUMN public.bookings.service_type IS 'Type of service being booked';
COMMENT ON COLUMN public.bookings.status IS 'Current status of the booking';
