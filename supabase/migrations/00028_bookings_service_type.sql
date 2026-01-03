-- Add service_type column to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS service_type text;
