
CREATE POLICY "Users can view their own category memberships"
ON public.category_members
FOR SELECT
USING (auth.uid() = user_id);
