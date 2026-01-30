-- Fix RLS policies for gig_applications (formerly opportunity_applications)
-- The original policy incorrectly compared model_id to actors.id instead of models.id

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own applications" ON public.gig_applications;
DROP POLICY IF EXISTS "Users can insert their own applications" ON public.gig_applications;
DROP POLICY IF EXISTS "Users can withdraw their own applications" ON public.gig_applications;

-- Recreate with correct model_id check
CREATE POLICY "Users can view their own applications" ON public.gig_applications
  FOR SELECT USING (
    model_id = (SELECT id FROM public.models WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own applications" ON public.gig_applications
  FOR INSERT WITH CHECK (
    model_id = (SELECT id FROM public.models WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own applications" ON public.gig_applications
  FOR UPDATE USING (
    model_id = (SELECT id FROM public.models WHERE user_id = auth.uid())
  );
