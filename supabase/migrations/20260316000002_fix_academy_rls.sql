-- Fix overly permissive RLS on academy_applications
-- The previous policy allowed all operations for all users
-- Replace with proper policies: only service role (webhooks/admin) and applicants viewing their own

DROP POLICY IF EXISTS "Service role full access" ON academy_applications;
DROP POLICY IF EXISTS "Applicants can view own applications" ON academy_applications;

-- Applicants can view their own applications by email
CREATE POLICY "Applicants can view own applications" ON academy_applications
  FOR SELECT
  USING (
    applicant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Only service role can insert/update/delete (used by API routes and webhooks)
-- Service role bypasses RLS by default, so no explicit policy needed for it
