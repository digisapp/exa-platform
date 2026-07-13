-- Weekly analytics report: fan-signup counts by signup_source (stored in auth
-- user_metadata by FanSignupDialog). auth.users is not queryable through
-- PostgREST, so expose exactly this aggregate via a SECURITY DEFINER function,
-- locked to the service role per the money-RPC convention (20260611000001).
CREATE OR REPLACE FUNCTION public.get_fan_signup_source_counts(
  p_since timestamptz,
  p_until timestamptz
)
RETURNS TABLE(source text, signups bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(u.raw_user_meta_data->>'signup_source', '(none)') AS source,
    count(*) AS signups
  FROM auth.users u
  WHERE u.created_at >= p_since
    AND u.created_at < p_until
    AND u.raw_user_meta_data->>'signup_type' = 'fan'
  GROUP BY 1
  ORDER BY 2 DESC;
$$;

REVOKE ALL ON FUNCTION public.get_fan_signup_source_counts(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_fan_signup_source_counts(timestamptz, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.get_fan_signup_source_counts(timestamptz, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_fan_signup_source_counts(timestamptz, timestamptz) TO service_role;
