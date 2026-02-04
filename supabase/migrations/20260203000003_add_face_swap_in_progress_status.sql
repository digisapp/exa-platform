-- Add face_swap_in_progress status to ai_generations
ALTER TABLE ai_generations DROP CONSTRAINT IF EXISTS ai_generations_status_check;
ALTER TABLE ai_generations ADD CONSTRAINT ai_generations_status_check
  CHECK (status IN ('pending', 'processing', 'face_swap_pending', 'face_swap_in_progress', 'completed', 'failed'));
