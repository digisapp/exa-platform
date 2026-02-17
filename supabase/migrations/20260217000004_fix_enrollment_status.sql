-- Fix content_program_enrollments status CHECK constraint
-- The original constraint did not include 'pending', which is needed
-- for the direct checkout flow (enrollment created before payment)

ALTER TABLE content_program_enrollments
  DROP CONSTRAINT IF EXISTS content_program_enrollments_status_check;

ALTER TABLE content_program_enrollments
  ADD CONSTRAINT content_program_enrollments_status_check
  CHECK (status IN ('pending', 'active', 'paused', 'completed', 'cancelled', 'swim_week'));
