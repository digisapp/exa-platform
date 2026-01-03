-- Add missing columns to bookings table
-- These columns were defined in 00023 but may not have been applied

-- Client notes
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS client_notes text;

-- Model notes
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS model_notes text;

-- Model response notes
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS model_response_notes text;

-- Service description
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS service_description text;

-- Duration hours
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS duration_hours numeric(4,1);

-- Start time
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS start_time time;

-- Location fields
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS location_name text;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS location_address text;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS location_city text;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS location_state text;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS is_remote boolean DEFAULT false;

-- Counter offer fields
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS counter_amount integer;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS counter_notes text;

-- Cancellation fields
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.actors(id);

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS cancellation_reason text;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Timestamp fields
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS responded_at timestamptz;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Deposit fields
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS deposit_amount integer DEFAULT 0;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS deposit_paid boolean DEFAULT false;
