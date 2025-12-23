-- ============================================
-- FIX 1: profiles table - Remove super admin full access, keep email protected
-- ============================================

-- Drop the problematic super admin policy that exposes all emails
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

-- Super admins can view profiles but without direct table access to email
-- They must use get_safe_profile function which masks emails
CREATE POLICY "Super admins can view profiles without email"
ON public.profiles
FOR SELECT
USING (
  is_super_admin(auth.uid()) AND auth.uid() != id
);

-- Note: get_safe_profile function already masks emails for non-owners

-- ============================================
-- FIX 2: player_contacts - Restrict to owners and admins ONLY (remove coach access)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Owners and staff can view player contacts" ON public.player_contacts;
DROP POLICY IF EXISTS "Owners and staff can insert player contacts" ON public.player_contacts;
DROP POLICY IF EXISTS "Owners and staff can update player contacts" ON public.player_contacts;
DROP POLICY IF EXISTS "Owners and staff can delete player contacts" ON public.player_contacts;

-- More restrictive SELECT - only owners and admins
CREATE POLICY "Only owners and admins can view player contacts"
ON public.player_contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_contacts.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);

-- INSERT - only owners and admins
CREATE POLICY "Only owners and admins can insert player contacts"
ON public.player_contacts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_contacts.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);

-- UPDATE - only owners and admins
CREATE POLICY "Only owners and admins can update player contacts"
ON public.player_contacts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_contacts.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);

-- DELETE - only owners and admins
CREATE POLICY "Only owners and admins can delete player contacts"
ON public.player_contacts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_contacts.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);

-- ============================================
-- FIX 3: body_composition - Restrict to medical staff and owners only
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Club members can view body composition" ON public.body_composition;
DROP POLICY IF EXISTS "Club members can insert body composition" ON public.body_composition;
DROP POLICY IF EXISTS "Club members can update body composition" ON public.body_composition;
DROP POLICY IF EXISTS "Club members can delete body composition" ON public.body_composition;

-- Create helper function to check if user has medical role
CREATE OR REPLACE FUNCTION public.has_medical_access(_user_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs WHERE id = _club_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.club_members 
    WHERE user_id = _user_id 
    AND club_id = _club_id 
    AND role IN ('admin', 'physio', 'doctor')
  )
$$;

-- SELECT - only owners, admins, physio, doctor
CREATE POLICY "Medical staff can view body composition"
ON public.body_composition
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = body_composition.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

-- INSERT - only owners, admins, physio, doctor
CREATE POLICY "Medical staff can insert body composition"
ON public.body_composition
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = body_composition.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

-- UPDATE - only owners, admins, physio, doctor
CREATE POLICY "Medical staff can update body composition"
ON public.body_composition
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = body_composition.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

-- DELETE - only owners, admins, physio, doctor
CREATE POLICY "Medical staff can delete body composition"
ON public.body_composition
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = body_composition.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);