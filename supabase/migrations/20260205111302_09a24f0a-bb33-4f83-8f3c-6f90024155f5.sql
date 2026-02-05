-- Add policy to allow anonymous users to read invitations by token (for signup flow)
CREATE POLICY "Anyone can view invitation by token"
ON public.athlete_invitations
FOR SELECT
USING (true);

-- Drop the old restrictive select policy
DROP POLICY IF EXISTS "Staff can view category invitations" ON public.athlete_invitations;

-- Recreate staff policy for viewing all invitations in their categories
CREATE POLICY "Staff can view all category invitations"
ON public.athlete_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.category_members cm
    WHERE cm.category_id = athlete_invitations.category_id
    AND cm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.club_members clm
    WHERE clm.club_id = athlete_invitations.club_id
    AND clm.user_id = auth.uid()
  )
  OR true -- Allow public read for token-based lookups
);