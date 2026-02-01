-- Add missing columns to call_requests table
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES models(id);
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS source_detail TEXT;
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS call_type TEXT;
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS scheduled_duration INTEGER DEFAULT 15;
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS call_duration INTEGER;
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_requests_source ON call_requests(source);
CREATE INDEX IF NOT EXISTS idx_call_requests_scheduled ON call_requests(scheduled_at);
