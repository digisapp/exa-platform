-- Fix cancelled_by foreign key constraint
-- It currently references profiles but should reference actors

-- Drop the incorrect foreign key constraint
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_cancelled_by_fkey;

-- Add the correct foreign key constraint referencing actors
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_cancelled_by_fkey
FOREIGN KEY (cancelled_by) REFERENCES public.actors(id) ON DELETE SET NULL;
