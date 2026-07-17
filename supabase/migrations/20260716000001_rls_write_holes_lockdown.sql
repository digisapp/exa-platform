-- Close directly-exploitable RLS/grant holes on models, gig_applications, and
-- withdrawal_requests. These are PostgREST-reachable with the public anon key,
-- bypassing every app-layer gate.
--
-- Context (verified against live prod 2026-07-16):
--   1. public.models carried FOUR permissive "USING (true)" policies
--      (models_select_policy, models_insert_policy, models_update_policy,
--      models_delete_policy) for {anon, authenticated} that completely neuter
--      RLS. models_update_policy in particular is USING(true) WITH CHECK(true),
--      so anyone with the anon key can:
--        UPDATE public.models SET coin_balance = 999999   -- mint coins
--        UPDATE public.models SET is_approved = true       -- self-approve
--        DELETE FROM public.models                         -- wipe the roster
--      These policies appear to have been introduced later (a code comment in
--      api/models/[id]/view already assumes "visitors have no UPDATE policy on
--      models" and uses the service role). Every legitimate non-service model
--      write is either own-row (.eq user_id = auth.uid(), covered by the scoped
--      "users update own models" / "Users can update their own model profile"
--      policies) or done through the service role (signup, approval, admin,
--      profile-view increment). So dropping the permissive policies is safe.
--
--   2. gig_applications UPDATE policy for models had USING (own row) but NO
--      WITH CHECK, so a model could PATCH their own row to
--      {status:'accepted', payment_status:'paid'} — self-accepting into a gig
--      and marking a paid trip settled without paying. All legit model
--      self-service writes only ever set status='pending' and payment_status in
--      (null,'pending','interested'); status='accepted'/payment_status='paid'
--      is written exclusively by the admin service-role route and the Stripe
--      webhook (both service role, which bypass RLS).
--
--   3. withdrawal_requests granted INSERT/UPDATE/DELETE to {anon,authenticated}
--      plus an unused "Models can create withdrawals" INSERT policy. A model
--      could insert a pending payout for an arbitrary amount with no balance
--      deduction and no KYC. All legitimate writes go through the
--      create_withdrawal_request / create_payoneer_withdrawal_request
--      SECURITY DEFINER RPCs (which own the table) or the admin/webhook service
--      role. No client code inserts/deletes the table directly; the one admin
--      "processing" UPDATE that used the session client was moved to the
--      service role in the same change as this migration.

-- ============================================================
-- 1. public.models — drop the permissive USING(true) policies
-- ============================================================
-- Removing these leaves RLS enforced by the correctly-scoped policies that
-- remain:
--   SELECT: "Models are viewable by everyone" (is_approved OR own actor),
--           "Fans can view approved models" (approved OR own OR admin/fan)
--   INSERT: "Users can insert their own model profile"
--   UPDATE: "users update own models" (auth.uid = user_id),
--           "Users can update their own model profile" (own actor)
--   DELETE: none remains -> clients cannot delete; service role still can.
DROP POLICY IF EXISTS "models_select_policy" ON public.models;
DROP POLICY IF EXISTS "models_insert_policy" ON public.models;
DROP POLICY IF EXISTS "models_update_policy" ON public.models;
DROP POLICY IF EXISTS "models_delete_policy" ON public.models;
-- Redundant duplicate anon/authenticated INSERT policy from an early migration.
DROP POLICY IF EXISTS "public insert models" ON public.models;

-- Defense in depth: no client role should ever DELETE a model row (account
-- removal is a service-role soft-delete). Revoke the blanket DELETE grant so a
-- future stray permissive policy can't re-open roster deletion.
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.models FROM anon, authenticated;
-- anon never writes models (signup/approval are service role); keep authenticated
-- INSERT/UPDATE for model self-service (now gated by the scoped policies above).
REVOKE INSERT, UPDATE ON public.models FROM anon;

-- ============================================================
-- 2. public.gig_applications — pin the model self-update policy
-- ============================================================
DROP POLICY IF EXISTS "Users can update their own applications" ON public.gig_applications;
CREATE POLICY "Users can update their own applications" ON public.gig_applications
  FOR UPDATE
  USING (
    model_id = (SELECT id FROM public.models WHERE user_id = auth.uid())
    AND status = 'pending'
    AND payment_status IS DISTINCT FROM 'paid'
  )
  WITH CHECK (
    model_id = (SELECT id FROM public.models WHERE user_id = auth.uid())
    AND status = 'pending'
    AND (payment_status IS NULL OR payment_status IN ('pending', 'interested'))
  );
-- Admin transitions (status -> accepted/rejected/waitlist) keep working via the
-- separate permissive "Admins can manage all applications" ALL policy and the
-- service-role admin route; the Stripe webhook (service role) writes
-- payment_status='paid'/status='accepted'. anon never writes applications.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.gig_applications FROM anon;

-- ============================================================
-- 3. public.withdrawal_requests — force writes through the RPCs
-- ============================================================
DROP POLICY IF EXISTS "Models can create withdrawals" ON public.withdrawal_requests;
-- All legit writes go through SECURITY DEFINER RPCs (create_withdrawal_request,
-- create_payoneer_withdrawal_request, cancel_withdrawal, complete_withdrawal —
-- the definer owns the table and bypasses RLS) or the admin/webhook service
-- role. SELECT grant is left intact so models can read their own rows.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.withdrawal_requests FROM anon, authenticated;
