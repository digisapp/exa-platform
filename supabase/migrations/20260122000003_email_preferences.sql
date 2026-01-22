-- ============================================
-- EMAIL PREFERENCES AND UNSUBSCRIBE
-- ============================================

-- Table to track email preferences per user
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  marketing_emails boolean DEFAULT true,
  notification_emails boolean DEFAULT true,
  unsubscribed_all boolean DEFAULT false,
  unsubscribe_token uuid DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own preferences
CREATE POLICY "Users can view own preferences" ON public.email_preferences
  FOR SELECT USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can update own preferences" ON public.email_preferences
  FOR UPDATE USING (user_id = auth.uid());

-- Allow anonymous unsubscribe via token
CREATE POLICY "Anyone can unsubscribe via token" ON public.email_preferences
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_email_preferences_email ON public.email_preferences(email);
CREATE INDEX IF NOT EXISTS idx_email_preferences_token ON public.email_preferences(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_email_preferences_user ON public.email_preferences(user_id);

-- Function to get or create email preferences
CREATE OR REPLACE FUNCTION public.get_or_create_email_preferences(
  p_email text,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  email text,
  marketing_emails boolean,
  notification_emails boolean,
  unsubscribed_all boolean,
  unsubscribe_token uuid
) AS $$
DECLARE
  pref_id uuid;
  pref_token uuid;
BEGIN
  -- Try to find existing preference
  SELECT ep.id, ep.unsubscribe_token INTO pref_id, pref_token
  FROM public.email_preferences ep
  WHERE ep.email = p_email;

  -- Create if not exists
  IF pref_id IS NULL THEN
    INSERT INTO public.email_preferences (email, user_id)
    VALUES (p_email, p_user_id)
    RETURNING email_preferences.id, email_preferences.unsubscribe_token INTO pref_id, pref_token;
  END IF;

  -- Return the preferences
  RETURN QUERY
  SELECT ep.id, ep.email, ep.marketing_emails, ep.notification_emails, ep.unsubscribed_all, ep.unsubscribe_token
  FROM public.email_preferences ep
  WHERE ep.id = pref_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unsubscribe via token
CREATE OR REPLACE FUNCTION public.unsubscribe_email(
  p_token uuid,
  p_unsubscribe_all boolean DEFAULT true
)
RETURNS jsonb AS $$
DECLARE
  pref_email text;
BEGIN
  -- Find and update the preference
  UPDATE public.email_preferences
  SET
    unsubscribed_all = CASE WHEN p_unsubscribe_all THEN true ELSE unsubscribed_all END,
    marketing_emails = CASE WHEN NOT p_unsubscribe_all THEN false ELSE marketing_emails END,
    updated_at = now()
  WHERE unsubscribe_token = p_token
  RETURNING email INTO pref_email;

  IF pref_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid unsubscribe token');
  END IF;

  RETURN jsonb_build_object('success', true, 'email', pref_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if email is unsubscribed
CREATE OR REPLACE FUNCTION public.is_email_unsubscribed(
  p_email text,
  p_email_type text DEFAULT 'all' -- 'all', 'marketing', 'notification'
)
RETURNS boolean AS $$
DECLARE
  pref record;
BEGIN
  SELECT * INTO pref FROM public.email_preferences WHERE email = p_email;

  IF pref IS NULL THEN
    RETURN false;
  END IF;

  IF pref.unsubscribed_all THEN
    RETURN true;
  END IF;

  IF p_email_type = 'marketing' AND NOT pref.marketing_emails THEN
    RETURN true;
  END IF;

  IF p_email_type = 'notification' AND NOT pref.notification_emails THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
