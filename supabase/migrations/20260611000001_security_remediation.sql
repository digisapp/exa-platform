-- ============================================================
-- SECURITY REMEDIATION (2026-06-11 full-platform audit)
--
-- Companion code changes (must deploy together with this migration):
--   - auctions bid/buy-now, games/boost/vote, swimcrown/vote, admin/payouts
--     now call money RPCs with the service-role client
--   - shop cart/checkout routes access shop_carts/shop_cart_items via the
--     service-role client (guest carts cannot be scoped by RLS)
--   - content-program/apply uses the service-role client
-- ============================================================

-- ------------------------------------------------------------
-- 1. Lock down SECURITY DEFINER money functions.
-- These were executable by anon/authenticated via PostgREST with no
-- auth.uid() binding, allowing arbitrary coin minting/draining
-- (e.g. rpc('update_actor_coin_balance', {p_actor_id: me, p_amount: 1e6})).
-- All app call sites now use the service-role client. Internal
-- function-to-function calls run as the definer and are unaffected.
-- Revokes every overload by name so signature drift can't leave a hole.
-- ------------------------------------------------------------
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_actor_coin_balance',
        'add_coins',
        'deduct_coins',
        'place_auction_bid',
        'buy_now_auction',
        'end_auction',
        'refund_auction_escrows',
        'cast_swimcrown_vote'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 2. Enable RLS on tables that were fully exposed via the anon REST API.
-- workshop_installments + shop carts are service-role-only: RLS with no
-- policies blocks all anon/authenticated access; service role bypasses.
-- ------------------------------------------------------------
ALTER TABLE public.workshop_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_model_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_affiliate_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_brand_payouts ENABLE ROW LEVEL SECURITY;

-- Catalog tables: public read; admin pages manage them from the browser.
DROP POLICY IF EXISTS "Public can view categories" ON public.shop_categories;
CREATE POLICY "Public can view categories" ON public.shop_categories
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage categories" ON public.shop_categories;
CREATE POLICY "Admins can manage categories" ON public.shop_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

DROP POLICY IF EXISTS "Public can view model products" ON public.shop_model_products;
CREATE POLICY "Public can view model products" ON public.shop_model_products
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage model products" ON public.shop_model_products;
CREATE POLICY "Admins can manage model products" ON public.shop_model_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

-- Affiliate codes: storefront validates active codes; models manage their own
-- (api/shop/affiliate uses the user-context client); admins manage all.
DROP POLICY IF EXISTS "Public can view active affiliate codes" ON public.shop_affiliate_codes;
CREATE POLICY "Public can view active affiliate codes" ON public.shop_affiliate_codes
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Models can manage own affiliate codes" ON public.shop_affiliate_codes;
CREATE POLICY "Models can manage own affiliate codes" ON public.shop_affiliate_codes
  FOR ALL USING (
    model_id IN (SELECT id FROM public.models WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Admins can manage affiliate codes" ON public.shop_affiliate_codes;
CREATE POLICY "Admins can manage affiliate codes" ON public.shop_affiliate_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

-- Order items: buyers read items of their own orders (orders routes embed
-- shop_order_items); shop brands read/update fulfillment on their own items
-- (brand routes resolve the brand by contact_email); admins manage all.
-- Writes (checkout, POS, webhook) are service-role.
DROP POLICY IF EXISTS "Buyers can view own order items" ON public.shop_order_items;
CREATE POLICY "Buyers can view own order items" ON public.shop_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shop_orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Brands can view own order items" ON public.shop_order_items;
CREATE POLICY "Brands can view own order items" ON public.shop_order_items
  FOR SELECT USING (
    brand_id IN (
      SELECT id FROM public.shop_brands
      WHERE contact_email = (auth.jwt() ->> 'email')
    )
  );
DROP POLICY IF EXISTS "Brands can update own order items" ON public.shop_order_items;
CREATE POLICY "Brands can update own order items" ON public.shop_order_items
  FOR UPDATE USING (
    brand_id IN (
      SELECT id FROM public.shop_brands
      WHERE contact_email = (auth.jwt() ->> 'email')
    )
  );
DROP POLICY IF EXISTS "Admins can manage order items" ON public.shop_order_items;
CREATE POLICY "Admins can manage order items" ON public.shop_order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

-- Brand payouts: brands read their own; admins manage; writes otherwise service-role.
DROP POLICY IF EXISTS "Brands can view own payouts" ON public.shop_brand_payouts;
CREATE POLICY "Brands can view own payouts" ON public.shop_brand_payouts
  FOR SELECT USING (
    brand_id IN (
      SELECT id FROM public.shop_brands
      WHERE contact_email = (auth.jwt() ->> 'email')
    )
  );
DROP POLICY IF EXISTS "Admins can manage brand payouts" ON public.shop_brand_payouts;
CREATE POLICY "Admins can manage brand payouts" ON public.shop_brand_payouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

-- ------------------------------------------------------------
-- 3. Fix defective policies (name promised a restriction the predicate
--    didn't enforce, or policy was exploitable dead weight).
-- ------------------------------------------------------------

-- "Admins can insert ticket purchases" had WITH CHECK (true): anyone could
-- forge purchase rows. Real inserts come from the Stripe webhook (service role).
DROP POLICY IF EXISTS "Admins can insert ticket purchases" ON public.ticket_purchases;
CREATE POLICY "Admins can insert ticket purchases" ON public.ticket_purchases
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

-- "Anyone can unsubscribe via token" was USING (true) with no token check:
-- anon could rewrite any user's email preferences. Unsubscribes go through
-- the service role (src/lib/email.ts).
DROP POLICY IF EXISTS "Anyone can unsubscribe via token" ON public.email_preferences;

-- Direct INSERT into swimcrown_votes bypassed the paid cast_swimcrown_vote RPC
-- (arbitrary coins_spent without paying). The app only writes via the RPC.
DROP POLICY IF EXISTS "Auth users can insert votes" ON public.swimcrown_votes;

-- Registrations are created server-side (service role) in workshops/checkout;
-- the public INSERT policy allowed forging paid-looking rows.
DROP POLICY IF EXISTS "Anyone can insert registrations" ON public.workshop_registrations;
-- The admin workshops page deletes registrations from the browser but no
-- DELETE policy existed (deletes silently affected 0 rows).
DROP POLICY IF EXISTS "Admins can delete registrations" ON public.workshop_registrations;
CREATE POLICY "Admins can delete registrations" ON public.workshop_registrations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

-- model_badges had WITH CHECK (true) insert/delete policies because the
-- manage_event_badge() trigger runs as the calling role. Make the trigger
-- function SECURITY DEFINER instead, then drop the open policies.
ALTER FUNCTION public.manage_event_badge() SECURITY DEFINER SET search_path = public;
DROP POLICY IF EXISTS "System can insert model badges" ON public.model_badges;
DROP POLICY IF EXISTS "System can delete model badges" ON public.model_badges;

-- 20260415000003_add_missing_rls.sql granted every authenticated user SELECT
-- on applicant PII, payment records, and brands' private notes. The remaining
-- "manage own" / "admin manage" FOR ALL policies cover every legitimate read
-- path (owner dashboards, admin pages); server reads use the service role.
DROP POLICY IF EXISTS "Authenticated users can view applications" ON public.content_program_applications;
DROP POLICY IF EXISTS "Authenticated users can view enrollments" ON public.content_program_enrollments;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.content_program_payments;
DROP POLICY IF EXISTS "Authenticated users can view deliverables" ON public.content_program_deliverables;
DROP POLICY IF EXISTS "Authenticated users can view brand model notes" ON public.brand_model_notes;

-- ------------------------------------------------------------
-- 4. Protect moderation columns (message_moderation_flags feature).
-- Broad row-owner UPDATE policies on messages/fans would let a flagged user
-- clear their own is_flagged / flagged_for_review state via PostgREST.
-- Service role (auth.uid() IS NULL) and admins remain able to change them.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_moderation_columns()
RETURNS trigger AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin'
     ) THEN
    IF TG_TABLE_NAME = 'messages' THEN
      IF NEW.is_flagged IS DISTINCT FROM OLD.is_flagged
         OR NEW.flagged_reason IS DISTINCT FROM OLD.flagged_reason THEN
        RAISE EXCEPTION 'moderation columns are read-only';
      END IF;
    ELSIF TG_TABLE_NAME = 'fans' THEN
      IF NEW.flagged_for_review IS DISTINCT FROM OLD.flagged_for_review
         OR NEW.flagged_for_review_at IS DISTINCT FROM OLD.flagged_for_review_at
         OR NEW.flagged_for_review_reason IS DISTINCT FROM OLD.flagged_for_review_reason THEN
        RAISE EXCEPTION 'moderation columns are read-only';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_message_moderation_flags ON public.messages;
CREATE TRIGGER protect_message_moderation_flags
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.protect_moderation_columns();

DROP TRIGGER IF EXISTS protect_fan_moderation_flags ON public.fans;
CREATE TRIGGER protect_fan_moderation_flags
  BEFORE UPDATE ON public.fans
  FOR EACH ROW EXECUTE FUNCTION public.protect_moderation_columns();
