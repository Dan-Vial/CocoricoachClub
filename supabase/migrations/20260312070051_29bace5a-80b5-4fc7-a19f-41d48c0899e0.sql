-- Allow anyone (including anonymous/unauthenticated) to read ambassador invitations by token
-- This is needed for the invitation acceptance flow
CREATE POLICY "Anyone can view invitation by token"
ON public.ambassador_invitations
FOR SELECT
TO anon, authenticated
USING (true);

-- Also allow authenticated users to update invitation status (for accepting)
CREATE POLICY "Authenticated users can update invitation status"
ON public.ambassador_invitations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);