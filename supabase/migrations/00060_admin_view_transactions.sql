-- ============================================
-- ALLOW ADMINS TO VIEW ALL COIN TRANSACTIONS
-- ============================================

-- Admins can view all coin transactions
DROP POLICY IF EXISTS "Admins can view all coin transactions" ON public.coin_transactions;
CREATE POLICY "Admins can view all coin transactions" ON public.coin_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE user_id = auth.uid() AND type = 'admin'
    )
  );
