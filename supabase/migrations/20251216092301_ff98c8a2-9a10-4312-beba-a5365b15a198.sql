-- Add policy to allow users to check their own super admin status
CREATE POLICY "Users can check own super admin status"
ON public.super_admin_users
FOR SELECT
USING (auth.uid() = user_id);