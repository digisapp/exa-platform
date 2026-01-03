-- Comprehensive migration to ensure all bookings columns exist
-- This adds any missing columns from the original schema

-- Core booking fields
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.models(id) ON DELETE CASCADE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.actors(id) ON DELETE CASCADE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_number text;

-- Service details
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS service_type text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS service_description text;

-- Date and time
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS event_date date;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS duration_hours numeric(4,1);

-- Location
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS location_name text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS location_address text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS location_city text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS location_state text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_remote boolean DEFAULT false;

-- Pricing
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS quoted_rate integer;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_amount integer;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_amount integer DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_paid boolean DEFAULT false;

-- Status
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Counter offer
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS counter_amount integer;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS counter_notes text;

-- Notes
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_notes text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS model_notes text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS model_response_notes text;

-- Cancellation
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_by uuid;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Timestamps
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS responded_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create booking_number generation function if not exists
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS text AS $$
DECLARE
  new_number text;
  exists_check boolean;
BEGIN
  LOOP
    new_number := 'EXA-' || upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.bookings WHERE booking_number = new_number) INTO exists_check;
    IF NOT exists_check THEN
      RETURN new_number;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate booking number
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

-- Add indexes if not exist
CREATE INDEX IF NOT EXISTS idx_bookings_model_id ON public.bookings(model_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON public.bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);
