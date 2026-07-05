-- Reconcile the legacy models.status text column with is_approved
-- ------------------------------------------------------------------
-- models.status is a dead column: nothing in the current codebase reads or
-- writes it (the is_approved boolean is the source of truth for the explore
-- page, call checks, and the audited admin approve/reject flow). It drifted:
-- 68 approved, claimed, active models still carried status='rejected'/'declined'
-- from the pre-boolean onboarding flow (Nov 2025 era), 26 of them live on the
-- explore page. That contradiction misled admins and analytics.
--
-- Decision (2026-07-04, reviewed with owner): the boolean + months of real
-- account activity reflect the actual admin intent, so the text is aligned to
-- the boolean — NOT the other way around (no models are unlisted here). The
-- affected usernames were exported for owner review before this ran.
--
-- status='pending' rows are left alone: they don't contradict (auto-approve
-- semantics) and preserve the "never human-reviewed" signal.
--
-- Going forward the admin route writes both fields together, so this cannot
-- drift again.

UPDATE public.models
SET status = 'approved', updated_at = now()
WHERE is_approved = true
  AND status IN ('rejected', 'declined')
  AND deleted_at IS NULL
  AND purged_at IS NULL;
