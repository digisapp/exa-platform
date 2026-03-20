-- Email inbox/sent table for Resend inbound + outbound tracking
CREATE TABLE IF NOT EXISTS public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Direction: inbound (received) or outbound (sent)
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  -- Threading
  thread_id UUID REFERENCES public.emails(id) ON DELETE SET NULL,
  resend_message_id TEXT,
  -- Addresses
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  to_name TEXT,
  reply_to TEXT,
  cc TEXT,
  bcc TEXT,
  -- Content
  subject TEXT NOT NULL DEFAULT '(no subject)',
  body_html TEXT,
  body_text TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'read', 'replied', 'sent', 'delivered', 'bounced', 'failed')),
  -- Metadata
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- admin who sent (for outbound)
  metadata JSONB DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_emails_direction ON public.emails(direction);
CREATE INDEX idx_emails_status ON public.emails(status);
CREATE INDEX idx_emails_created_at ON public.emails(created_at DESC);
CREATE INDEX idx_emails_thread_id ON public.emails(thread_id);
CREATE INDEX idx_emails_from_email ON public.emails(from_email);
CREATE INDEX idx_emails_to_email ON public.emails(to_email);
CREATE INDEX idx_emails_resend_message_id ON public.emails(resend_message_id);

-- RLS: admin only
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all emails"
  ON public.emails FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

CREATE POLICY "Admins can insert emails"
  ON public.emails FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

CREATE POLICY "Admins can update emails"
  ON public.emails FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- Service role bypass for webhook inserts
CREATE POLICY "Service role can manage emails"
  ON public.emails FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
