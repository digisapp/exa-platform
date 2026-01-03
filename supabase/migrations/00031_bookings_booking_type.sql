-- Fix booking_type column - make it nullable
ALTER TABLE public.bookings
ALTER COLUMN booking_type DROP NOT NULL;
