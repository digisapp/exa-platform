-- Fix RLS policies for bookings table

-- Enable RLS if not already
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Models can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Models can update their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can update their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;

-- SELECT: Models can see bookings where they are the model
CREATE POLICY "Models can view their bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = bookings.model_id
      AND models.user_id = auth.uid()
    )
  );

-- SELECT: Clients can see bookings they created
CREATE POLICY "Clients can view their bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.id = bookings.client_id
      AND actors.user_id = auth.uid()
    )
  );

-- INSERT: Any authenticated user can create a booking
CREATE POLICY "Authenticated users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.id = client_id
    )
  );

-- UPDATE: Models can update bookings (for accepting/declining)
CREATE POLICY "Models can update their bookings" ON public.bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = bookings.model_id
      AND models.user_id = auth.uid()
    )
  );

-- UPDATE: Clients can update their bookings (for cancellation)
CREATE POLICY "Clients can update their bookings" ON public.bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.id = bookings.client_id
      AND actors.user_id = auth.uid()
    )
  );

-- ALL: Admins can do everything
CREATE POLICY "Admins can manage all bookings" ON public.bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );
