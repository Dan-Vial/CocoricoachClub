-- Allow super admins to do everything on exercise_library
CREATE POLICY "Super admins can view all exercises"
  ON public.exercise_library FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all exercises"
  ON public.exercise_library FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert exercises"
  ON public.exercise_library FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete exercises"
  ON public.exercise_library FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));