-- =============================================
-- CALL REQUESTS & CRM SYSTEM
-- For scheduling calls with potential and existing models
-- =============================================

-- Call Requests table
CREATE TABLE call_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact info (for public requests)
  name TEXT NOT NULL,
  instagram_handle TEXT,
  phone TEXT NOT NULL,
  email TEXT,

  -- For logged-in models
  model_id UUID REFERENCES models(id),
  user_id UUID REFERENCES auth.users(id),

  -- Request details
  message TEXT, -- Optional "What's this about?"
  source TEXT, -- Where they came from: 'instagram', 'email', 'dashboard', 'website', etc.
  source_detail TEXT, -- More specific: 'ig-story-jan31', 'onboarding-email', etc.

  -- Admin fields
  call_type TEXT, -- Admin assigns: 'onboarding', 'support', 'opportunity', 'check-in', 'other'
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to TEXT, -- Admin name/email who will call

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- New request, not yet contacted
    'scheduled',    -- Call scheduled for specific time
    'in_progress',  -- Currently on call
    'completed',    -- Call finished
    'no_answer',    -- Tried calling, no answer
    'voicemail',    -- Left voicemail
    'cancelled',    -- Request cancelled
    'spam'          -- Marked as spam
  )),

  -- Scheduling
  scheduled_at TIMESTAMPTZ, -- When call is scheduled for
  scheduled_duration INTEGER DEFAULT 15, -- Minutes

  -- Outcome
  completed_at TIMESTAMPTZ,
  call_duration INTEGER, -- Actual minutes
  outcome TEXT, -- 'successful', 'callback_requested', 'not_interested', 'signed_up', etc.

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call Notes (multiple notes per call request)
CREATE TABLE call_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_request_id UUID NOT NULL REFERENCES call_requests(id) ON DELETE CASCADE,

  -- Note content
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN (
    'general',      -- General notes
    'call_notes',   -- Notes from the actual call
    'follow_up',    -- Follow-up action needed
    'internal'      -- Internal admin notes
  )),

  -- Who wrote it
  created_by TEXT, -- Admin name/email

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM Tags for categorizing contacts
CREATE TABLE crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#6366f1', -- Hex color for display
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tags
INSERT INTO crm_tags (name, color, description) VALUES
  ('VIP', '#ec4899', 'High-value model'),
  ('High Potential', '#f59e0b', 'Shows strong potential'),
  ('Needs Follow-up', '#ef4444', 'Requires follow-up'),
  ('New Lead', '#3b82f6', 'New contact'),
  ('Active Model', '#22c55e', 'Current active EXA model'),
  ('Interested', '#8b5cf6', 'Interested in joining'),
  ('Not Ready', '#6b7280', 'Not ready to commit yet');

-- Junction table for tags on call requests
CREATE TABLE call_request_tags (
  call_request_id UUID NOT NULL REFERENCES call_requests(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by TEXT,
  PRIMARY KEY (call_request_id, tag_id)
);

-- CRM Activity Log (tracks all interactions)
CREATE TABLE crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Can be linked to call request, model, or both
  call_request_id UUID REFERENCES call_requests(id) ON DELETE SET NULL,
  model_id UUID REFERENCES models(id) ON DELETE SET NULL,

  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'call_requested',   -- Someone requested a call
    'call_scheduled',   -- Call was scheduled
    'call_completed',   -- Call was completed
    'call_missed',      -- Call was missed/no answer
    'note_added',       -- Note was added
    'tag_added',        -- Tag was added
    'tag_removed',      -- Tag was removed
    'status_changed',   -- Status was changed
    'email_sent',       -- Email was sent
    'sms_sent',         -- SMS was sent
    'follow_up_set',    -- Follow-up reminder set
    'signed_up'         -- Contact signed up as EXA model
  )),

  description TEXT,
  metadata JSONB DEFAULT '{}', -- Additional data

  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-up Reminders
CREATE TABLE crm_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_request_id UUID REFERENCES call_requests(id) ON DELETE CASCADE,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,

  reminder_at TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,

  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_call_requests_status ON call_requests(status);
CREATE INDEX idx_call_requests_model ON call_requests(model_id);
CREATE INDEX idx_call_requests_source ON call_requests(source);
CREATE INDEX idx_call_requests_created ON call_requests(created_at DESC);
CREATE INDEX idx_call_requests_scheduled ON call_requests(scheduled_at);
CREATE INDEX idx_call_notes_request ON call_notes(call_request_id);
CREATE INDEX idx_crm_activities_request ON crm_activities(call_request_id);
CREATE INDEX idx_crm_activities_model ON crm_activities(model_id);
CREATE INDEX idx_crm_reminders_date ON crm_reminders(reminder_at) WHERE is_completed = false;

-- Update timestamp trigger
CREATE TRIGGER update_call_requests_timestamp
  BEFORE UPDATE ON call_requests
  FOR EACH ROW EXECUTE FUNCTION update_shop_timestamp();

-- RLS Policies
ALTER TABLE call_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_request_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_reminders ENABLE ROW LEVEL SECURITY;

-- Models can see their own call requests
CREATE POLICY "Models can view own call requests"
  ON call_requests FOR SELECT
  USING (auth.uid() = user_id OR model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

-- Anyone can insert call requests (public form)
CREATE POLICY "Anyone can create call requests"
  ON call_requests FOR INSERT
  WITH CHECK (true);

-- Tags are public read
CREATE POLICY "Anyone can view tags"
  ON crm_tags FOR SELECT
  USING (true);
