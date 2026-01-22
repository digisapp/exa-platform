-- ============================================
-- RATE LIMITING SYSTEM
-- ============================================
-- Tracks API requests to prevent abuse

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- user_id, actor_id, or IP address
  endpoint text NOT NULL, -- endpoint category (e.g., 'messages', 'uploads', 'auth')
  request_count int DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

-- Enable RLS (service role only for rate limiting)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);

-- ============================================
-- RATE LIMIT CHECK FUNCTION
-- ============================================
-- Returns true if request is allowed, false if rate limited

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests int,
  p_window_seconds int
)
RETURNS jsonb AS $$
DECLARE
  current_record record;
  window_start_time timestamptz;
  is_allowed boolean;
  requests_remaining int;
  reset_at timestamptz;
BEGIN
  window_start_time := now() - (p_window_seconds || ' seconds')::interval;

  -- Get or create rate limit record with lock
  SELECT * INTO current_record
  FROM public.rate_limits
  WHERE identifier = p_identifier AND endpoint = p_endpoint
  FOR UPDATE;

  IF current_record IS NULL THEN
    -- First request, create record
    INSERT INTO public.rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, now())
    RETURNING * INTO current_record;

    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_requests - 1,
      'reset_at', current_record.window_start + (p_window_seconds || ' seconds')::interval,
      'limit', p_max_requests
    );
  END IF;

  -- Check if window has expired
  IF current_record.window_start < window_start_time THEN
    -- Reset the window
    UPDATE public.rate_limits
    SET request_count = 1, window_start = now()
    WHERE id = current_record.id
    RETURNING * INTO current_record;

    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_requests - 1,
      'reset_at', current_record.window_start + (p_window_seconds || ' seconds')::interval,
      'limit', p_max_requests
    );
  END IF;

  -- Window is still active, check count
  IF current_record.request_count >= p_max_requests THEN
    -- Rate limited
    reset_at := current_record.window_start + (p_window_seconds || ' seconds')::interval;
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', reset_at,
      'limit', p_max_requests,
      'retry_after', EXTRACT(EPOCH FROM (reset_at - now()))::int
    );
  END IF;

  -- Increment counter
  UPDATE public.rate_limits
  SET request_count = request_count + 1
  WHERE id = current_record.id
  RETURNING * INTO current_record;

  requests_remaining := p_max_requests - current_record.request_count;
  reset_at := current_record.window_start + (p_window_seconds || ' seconds')::interval;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', requests_remaining,
    'reset_at', reset_at,
    'limit', p_max_requests
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CLEANUP OLD RATE LIMIT RECORDS
-- ============================================
-- Can be called periodically to clean up expired records

CREATE OR REPLACE FUNCTION public.cleanup_rate_limits(
  p_older_than_hours int DEFAULT 24
)
RETURNS int AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - (p_older_than_hours || ' hours')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
