-- Offer System Enhancements Migration
-- Features: Email notifications, Reminders, Check-in tracking, Recurring offers

-- =====================================================
-- 1. OFFER RESPONSES ENHANCEMENTS
-- =====================================================

-- Reminder tracking - prevent duplicate reminder emails
ALTER TABLE offer_responses ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Check-in tracking
ALTER TABLE offer_responses ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE offer_responses ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT false;

-- Indexes for cron job queries
CREATE INDEX IF NOT EXISTS idx_offer_responses_reminder
  ON offer_responses(status, reminder_sent_at)
  WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_offer_responses_checkin
  ON offer_responses(status, checked_in_at, no_show)
  WHERE status = 'confirmed';

-- =====================================================
-- 2. MODELS RELIABILITY SCORE
-- =====================================================

ALTER TABLE models ADD COLUMN IF NOT EXISTS reliability_score INTEGER;

-- Function to calculate reliability score for a model
CREATE OR REPLACE FUNCTION calculate_model_reliability_score(p_model_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_confirmed INTEGER;
  total_shows INTEGER;
  score INTEGER;
BEGIN
  -- Count total confirmed responses for past events
  SELECT COUNT(*) INTO total_confirmed
  FROM offer_responses orsp
  JOIN offers o ON orsp.offer_id = o.id
  WHERE orsp.model_id = p_model_id
    AND orsp.status = 'confirmed'
    AND o.event_date < CURRENT_DATE;

  -- Count shows (checked in, not marked no-show)
  SELECT COUNT(*) INTO total_shows
  FROM offer_responses orsp
  JOIN offers o ON orsp.offer_id = o.id
  WHERE orsp.model_id = p_model_id
    AND orsp.status = 'confirmed'
    AND orsp.checked_in_at IS NOT NULL
    AND orsp.no_show = false
    AND o.event_date < CURRENT_DATE;

  -- Calculate score (0-100), NULL if no data
  IF total_confirmed > 0 THEN
    score := ROUND((total_shows::DECIMAL / total_confirmed) * 100);
  ELSE
    score := NULL;
  END IF;

  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update model's reliability score (called by trigger)
CREATE OR REPLACE FUNCTION update_model_reliability_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE models
  SET reliability_score = calculate_model_reliability_score(NEW.model_id)
  WHERE id = NEW.model_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_reliability_score ON offer_responses;

-- Trigger to recalculate score when check-in or no-show changes
CREATE TRIGGER trigger_update_reliability_score
AFTER UPDATE OF checked_in_at, no_show ON offer_responses
FOR EACH ROW
WHEN (OLD.checked_in_at IS DISTINCT FROM NEW.checked_in_at
   OR OLD.no_show IS DISTINCT FROM NEW.no_show)
EXECUTE FUNCTION update_model_reliability_score();

-- =====================================================
-- 3. RECURRING OFFERS
-- =====================================================

ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS parent_offer_id UUID REFERENCES offers(id) ON DELETE SET NULL;

-- Validate recurrence pattern
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_recurrence_pattern_check;
ALTER TABLE offers ADD CONSTRAINT offers_recurrence_pattern_check
  CHECK (recurrence_pattern IS NULL OR recurrence_pattern IN ('weekly', 'biweekly', 'monthly'));

-- Index for finding recurring templates
CREATE INDEX IF NOT EXISTS idx_offers_recurring
  ON offers(is_recurring, recurrence_pattern, recurrence_end_date)
  WHERE is_recurring = true;

-- Index for finding child offers
CREATE INDEX IF NOT EXISTS idx_offers_parent
  ON offers(parent_offer_id)
  WHERE parent_offer_id IS NOT NULL;
