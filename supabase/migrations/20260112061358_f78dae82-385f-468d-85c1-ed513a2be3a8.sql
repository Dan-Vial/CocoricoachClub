-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Club owners can manage tokens" ON public.public_access_tokens;
DROP POLICY IF EXISTS "Category members can manage tokens" ON public.public_access_tokens;

-- Create a more permissive policy for club-level tokens
-- Users who can access the club can create/manage club-level tokens
CREATE POLICY "Manage club tokens"
ON public.public_access_tokens
FOR ALL
USING (
  club_id IS NOT NULL 
  AND can_access_club(auth.uid(), club_id)
)
WITH CHECK (
  club_id IS NOT NULL 
  AND can_access_club(auth.uid(), club_id)
  AND created_by = auth.uid()
);

-- Create a policy for category-level tokens
-- Users who can access the category can create/manage category-level tokens
CREATE POLICY "Manage category tokens"
ON public.public_access_tokens
FOR ALL
USING (
  category_id IS NOT NULL 
  AND can_access_category(auth.uid(), category_id)
)
WITH CHECK (
  category_id IS NOT NULL 
  AND can_access_category(auth.uid(), category_id)
  AND created_by = auth.uid()
);

-- Allow users to read their own tokens regardless of club/category access
CREATE POLICY "Users can read their own tokens"
ON public.public_access_tokens
FOR SELECT
USING (created_by = auth.uid());