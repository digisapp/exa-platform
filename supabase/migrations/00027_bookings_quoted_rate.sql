-- Add quoted_rate and total_amount columns to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS quoted_rate integer;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS total_amount integer;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
