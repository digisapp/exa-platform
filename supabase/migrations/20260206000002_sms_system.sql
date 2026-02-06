-- =============================================
-- SMS BROADCAST SYSTEM
-- For Twilio SMS integration
-- =============================================

-- SMS Broadcasts table (each bulk send)
CREATE TABLE IF NOT EXISTS sms_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who sent it
  sent_by UUID REFERENCES auth.users(id),

  -- Message content
  message TEXT NOT NULL,

  -- Stats
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'completed', 'failed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- SMS Logs table (individual messages)
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to broadcast (if part of bulk send)
  broadcast_id UUID REFERENCES sms_broadcasts(id),

  -- Link to model (if known)
  model_id UUID,

  -- Phone number
  phone_number TEXT NOT NULL,

  -- Message content
  message TEXT NOT NULL,

  -- Direction
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  -- Status
  status TEXT DEFAULT 'pending',

  -- Response tracking (for inbound)
  response_type TEXT, -- 'positive', 'negative', 'opt_out', null

  -- Twilio reference
  twilio_sid TEXT,

  -- Error info
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add sms_opt_out flag to models if not exists
ALTER TABLE models ADD COLUMN IF NOT EXISTS sms_opt_out BOOLEAN DEFAULT FALSE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_broadcasts_sent_by ON sms_broadcasts(sent_by);
CREATE INDEX IF NOT EXISTS idx_sms_broadcasts_status ON sms_broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_sms_broadcasts_created ON sms_broadcasts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_logs_broadcast ON sms_logs(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_model ON sms_logs(model_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_logs_direction ON sms_logs(direction);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON sms_logs(created_at DESC);

-- RLS
ALTER TABLE sms_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "Admins full access sms_broadcasts"
  ON sms_broadcasts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

CREATE POLICY "Admins full access sms_logs"
  ON sms_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- Service role needs insert access for webhook
CREATE POLICY "Service role insert sms_logs"
  ON sms_logs FOR INSERT
  WITH CHECK (true);
