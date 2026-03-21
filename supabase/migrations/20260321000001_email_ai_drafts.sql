-- AI draft responses for inbound emails
-- Stores AI-generated draft replies for admin review before sending

ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS ai_draft_html TEXT;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS ai_draft_text TEXT;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS ai_category TEXT;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS ai_confidence REAL;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS ai_summary TEXT;
