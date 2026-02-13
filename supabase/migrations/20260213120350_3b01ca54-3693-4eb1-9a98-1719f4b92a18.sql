-- Add missing UPDATE policy for super admins on approved_users
CREATE POLICY "Super admins can update approved users"
ON public.approved_users
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));
