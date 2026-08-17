-- ============================================================================
-- Corrective follow-up to 20260810000001 (anon column-grant lockdown)
-- ============================================================================
-- 20260810000001 revoked the TABLE-level SELECT on content_items from anon and
-- re-granted a safe column subset excluding media_url. On a fresh database
-- built from migrations that is sufficient — anon never receives media_url.
--
-- But production carried a pre-existing COLUMN-level grant of media_url to anon
-- (applied directly, not via any migration). A table-level REVOKE does NOT
-- remove an explicit column-level grant, so media_url survived on prod until it
-- was revoked by hand. Any environment cloned from prod's grants — notably a
-- Supabase preview branch — would inherit the same stray grant and re-expose
-- the exclusive/PPV media path to the anon role.
--
-- This statement makes the revoke explicit and idempotent so every environment
-- (prod, branches, local resets) converges on the same state. Revoking a
-- privilege that was never granted is a harmless no-op.
-- ============================================================================

REVOKE SELECT (media_url) ON public.content_items FROM anon;
