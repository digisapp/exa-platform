-- Allow admins to delete emails
CREATE POLICY "Admins can delete emails"
  ON public.emails FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );
