-- Delete failed Stripe checkout registrations for Bridget Paddock (both pending, never completed)
DELETE FROM public.workshop_registrations
WHERE buyer_email = 'bridgetpaddock@gmail.com'
  AND status = 'pending'
  AND workshop_id = (SELECT id FROM public.workshops WHERE slug = 'runway-workshop');

-- Allow admins to delete registrations (e.g. failed Stripe transactions)
CREATE POLICY "Admins can delete registrations" ON public.workshop_registrations
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.actors
    WHERE actors.user_id = auth.uid()
    AND actors.type = 'admin'
  )
);
