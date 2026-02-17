-- Allow super admins to update clubs (e.g. link to client)
CREATE POLICY "Super admins can update all clubs"
ON public.clubs
FOR UPDATE
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));