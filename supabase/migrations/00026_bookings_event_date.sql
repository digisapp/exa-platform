-- Add event_date column to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS event_date date;

-- Add booking_number if missing
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS booking_number text;

-- Make booking_number unique if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_booking_number_key'
  ) THEN
    -- Generate booking numbers for any existing rows without one
    UPDATE public.bookings
    SET booking_number = 'EXA-' || upper(substr(md5(random()::text), 1, 6))
    WHERE booking_number IS NULL;

    -- Add unique constraint
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_booking_number_key UNIQUE (booking_number);
  END IF;
END $$;
