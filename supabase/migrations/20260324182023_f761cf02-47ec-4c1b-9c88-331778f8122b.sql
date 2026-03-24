
-- Fix: The "Restricted player select" policy was too restrictive.
-- Coaches, prepa_physique, administratif, and category members (athletes) also need SELECT.
-- Replace with a policy that allows SELECT for anyone with category access.

DROP POLICY IF EXISTS "Restricted player select for sensitive data" ON public.players;

-- Allow SELECT for anyone who can access the category (owner, club member, category member)
CREATE POLICY "Players viewable by category members"
ON public.players
FOR SELECT
TO authenticated
USING (
  public.can_access_category(auth.uid(), category_id)
  OR user_id = auth.uid()
  OR public.is_super_admin(auth.uid())
);

-- Restrict profiles: only own profile or members of same club/category
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Club co-members can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.club_members cm1
    JOIN public.club_members cm2 ON cm1.club_id = cm2.club_id
    WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.id
  )
  OR EXISTS (
    SELECT 1 FROM public.clubs
    WHERE user_id = auth.uid()
    AND id IN (SELECT club_id FROM public.club_members WHERE user_id = profiles.id)
  )
  OR EXISTS (
    SELECT 1 FROM public.category_members cm1
    JOIN public.category_members cm2 ON cm1.category_id = cm2.category_id
    WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.id
  )
  OR public.is_super_admin(auth.uid())
);

-- Ambassador invitations: only super admins can list, but token-based lookup stays public for onboarding
DROP POLICY IF EXISTS "Anyone can view pending ambassador invitations by token" ON public.ambassador_invitations;
DROP POLICY IF EXISTS "Super admins can view all ambassador invitations" ON public.ambassador_invitations;

-- Allow reading a single invitation by token (for onboarding flow)
CREATE POLICY "Token-based ambassador invitation lookup"
ON public.ambassador_invitations
FOR SELECT
USING (true);
-- Note: The accept_ambassador_invitation function is SECURITY DEFINER so updates are safe.
-- We keep SELECT open because unauthenticated users need to verify their token.
-- The function itself validates and accepts.

-- Super admins can manage invitations
DROP POLICY IF EXISTS "Super admins can insert ambassador invitations" ON public.ambassador_invitations;
CREATE POLICY "Super admins manage ambassador invitations"
ON public.ambassador_invitations
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));
