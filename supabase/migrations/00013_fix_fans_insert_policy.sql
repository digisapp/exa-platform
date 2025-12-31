-- ============================================
-- FIX FANS INSERT POLICY
-- ============================================
-- Users need to be able to create their own fan profile during onboarding

-- Allow users to insert their own fan profile
CREATE POLICY "Users can create own fan profile" ON public.fans
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Also need to allow users to insert actor records
-- Check if policy exists first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'actors' AND policyname = 'Users can create own actor'
  ) THEN
    CREATE POLICY "Users can create own actor" ON public.actors
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Allow users to read actors table to check if they have an account
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'actors' AND policyname = 'Users can view own actor'
  ) THEN
    CREATE POLICY "Users can view own actor" ON public.actors
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;
