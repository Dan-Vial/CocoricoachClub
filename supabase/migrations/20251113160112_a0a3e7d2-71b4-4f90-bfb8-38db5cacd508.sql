-- 1. Fix clubs.user_id nullable issue
-- Make user_id NOT NULL to ensure all clubs have an owner
ALTER TABLE public.clubs ALTER COLUMN user_id SET NOT NULL;

-- 2. Fix profiles RLS policies to allow club members to view each other
-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Club members can view each other profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recreate policies with proper access for club members
-- Users can always view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Club members can view profiles of other members in the same club
CREATE POLICY "Club members can view each other profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- User is a member and viewing another member's profile in same club
  EXISTS (
    SELECT 1 FROM public.club_members cm1
    WHERE cm1.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.club_members cm2
      WHERE cm2.club_id = cm1.club_id
      AND cm2.user_id = profiles.id
    )
  )
  -- Or user is a club owner viewing a member's profile
  OR EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = c.id
      AND cm.user_id = profiles.id
    )
  )
);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);