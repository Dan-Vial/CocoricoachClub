-- Allow super admins to view all categories
CREATE POLICY "Super admins can view all categories"
ON public.categories
FOR SELECT
USING (public.is_super_admin(auth.uid()));