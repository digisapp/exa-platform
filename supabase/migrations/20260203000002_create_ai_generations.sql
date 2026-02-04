-- Add face_swap_pending status to ai_generations
-- Drop existing constraint and add new one with face_swap_pending
ALTER TABLE ai_generations DROP CONSTRAINT IF EXISTS ai_generations_status_check;
ALTER TABLE ai_generations ADD CONSTRAINT ai_generations_status_check
  CHECK (status IN ('pending', 'processing', 'face_swap_pending', 'completed', 'failed'));
