-- =============================================
-- CRM SUPPORTING TABLES AND POLICIES
-- =============================================

-- Call Notes table
CREATE TABLE IF NOT EXISTS call_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_request_id UUID NOT NULL REFERENCES call_requests(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'general',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM Tags table
CREATE TABLE IF NOT EXISTS crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#6366f1',
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
  ('Not Ready', '#6b7280', 'Not ready to commit yet')
ON CONFLICT (name) DO NOTHING;

-- Call Request Tags junction table
CREATE TABLE IF NOT EXISTS call_request_tags (
  call_request_id UUID NOT NULL REFERENCES call_requests(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by TEXT,
  PRIMARY KEY (call_request_id, tag_id)
);

-- CRM Activities table
CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_request_id UUID REFERENCES call_requests(id) ON DELETE SET NULL,
  model_id UUID REFERENCES models(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM Reminders table
CREATE TABLE IF NOT EXISTS crm_reminders (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_notes_request ON call_notes(call_request_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_request ON crm_activities(call_request_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_model ON crm_activities(model_id);
CREATE INDEX IF NOT EXISTS idx_crm_reminders_date ON crm_reminders(reminder_at) WHERE is_completed = false;

-- Enable RLS on all tables
ALTER TABLE call_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_request_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_reminders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe to run if they don't exist)
DROP POLICY IF EXISTS "Models can view own call requests" ON call_requests;
DROP POLICY IF EXISTS "Anyone can create call requests" ON call_requests;
DROP POLICY IF EXISTS "Admins can do everything with call requests" ON call_requests;
DROP POLICY IF EXISTS "Anyone can view tags" ON crm_tags;
DROP POLICY IF EXISTS "Admins can manage tags" ON crm_tags;
DROP POLICY IF EXISTS "Admins can manage call notes" ON call_notes;
DROP POLICY IF EXISTS "Admins can manage call request tags" ON call_request_tags;
DROP POLICY IF EXISTS "Admins can manage activities" ON crm_activities;
DROP POLICY IF EXISTS "Admins can manage reminders" ON crm_reminders;

-- RLS Policies for call_requests
CREATE POLICY "Models can view own call requests"
  ON call_requests FOR SELECT
  USING (auth.uid() = user_id OR model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can create call requests"
  ON call_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can do everything with call requests"
  ON call_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- RLS Policies for crm_tags
CREATE POLICY "Anyone can view tags"
  ON crm_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tags"
  ON crm_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- RLS Policies for call_notes
CREATE POLICY "Admins can manage call notes"
  ON call_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- RLS Policies for call_request_tags
CREATE POLICY "Admins can manage call request tags"
  ON call_request_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- RLS Policies for crm_activities
CREATE POLICY "Admins can manage activities"
  ON crm_activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- RLS Policies for crm_reminders
CREATE POLICY "Admins can manage reminders"
  ON crm_reminders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );
