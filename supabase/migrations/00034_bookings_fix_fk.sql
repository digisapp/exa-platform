-- Drop and recreate foreign key constraints for bookings table
-- The client_id should reference actors table

-- Drop existing constraints if they exist
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_client_id_fkey;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_model_id_fkey;

-- Recreate with correct references
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_model_id_fkey
FOREIGN KEY (model_id) REFERENCES public.models(id) ON DELETE CASCADE;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_client_id_fkey
FOREIGN KEY (client_id) REFERENCES public.actors(id) ON DELETE CASCADE;
