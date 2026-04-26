-- Fix: brands table was missing an INSERT RLS policy.
-- Without this, new brand signups could not create their brand profile
-- (the actor record was created but the brands row was never inserted).

CREATE POLICY "Users can insert their own brand" ON public.brands
  FOR INSERT WITH CHECK (id = (SELECT id FROM public.actors WHERE user_id = auth.uid()));
