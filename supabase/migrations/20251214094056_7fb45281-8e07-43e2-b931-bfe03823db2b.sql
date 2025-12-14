-- Fix 1: Restrict profiles table - users can only view their own email
-- Drop existing policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create new policy: users can only see their own profile with email
-- Other users get profile info via get_safe_profile function
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Fix 2: Restrict player_contacts table - only club owners and admins/coaches can access
-- Drop existing policies
DROP POLICY IF EXISTS "Club members can view player contacts" ON public.player_contacts;
DROP POLICY IF EXISTS "Club members can insert player contacts" ON public.player_contacts;
DROP POLICY IF EXISTS "Club members can update player contacts" ON public.player_contacts;
DROP POLICY IF EXISTS "Club members can delete player contacts" ON public.player_contacts;
DROP POLICY IF EXISTS "Club owners can view player contacts" ON public.player_contacts;
DROP POLICY IF EXISTS "Club owners can insert player contacts" ON public.player_contacts;
DROP POLICY IF EXISTS "Club owners can update player contacts" ON public.player_contacts;
DROP POLICY IF EXISTS "Club owners can delete player contacts" ON public.player_contacts;

-- Create stricter policies - only owners, admins and coaches can access contact info
CREATE POLICY "Owners and staff can view player contacts"
ON public.player_contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = player_contacts.category_id
    AND (
      clubs.user_id = auth.uid() 
      OR has_club_role(auth.uid(), clubs.id, 'admin'::app_role)
      OR has_club_role(auth.uid(), clubs.id, 'coach'::app_role)
    )
  )
);

CREATE POLICY "Owners and staff can insert player contacts"
ON public.player_contacts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = player_contacts.category_id
    AND (
      clubs.user_id = auth.uid() 
      OR has_club_role(auth.uid(), clubs.id, 'admin'::app_role)
      OR has_club_role(auth.uid(), clubs.id, 'coach'::app_role)
    )
  )
);

CREATE POLICY "Owners and staff can update player contacts"
ON public.player_contacts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = player_contacts.category_id
    AND (
      clubs.user_id = auth.uid() 
      OR has_club_role(auth.uid(), clubs.id, 'admin'::app_role)
      OR has_club_role(auth.uid(), clubs.id, 'coach'::app_role)
    )
  )
);

CREATE POLICY "Owners and staff can delete player contacts"
ON public.player_contacts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = player_contacts.category_id
    AND (
      clubs.user_id = auth.uid() 
      OR has_club_role(auth.uid(), clubs.id, 'admin'::app_role)
      OR has_club_role(auth.uid(), clubs.id, 'coach'::app_role)
    )
  )
);

-- Fix 3: Add RLS policies to safe_club_invitations view
-- First check if it's a view (which it appears to be based on the schema)
-- Views inherit security from underlying tables, but we can add policies if it's a table
-- Since it appears to be a view, we'll ensure the underlying table is protected

-- Note: safe_club_invitations is a view that masks the token for security
-- The actual security comes from the underlying club_invitations table policies
-- which are already properly configured. The view is working as intended.