-- Fix profiles: Ensure policies target 'authenticated' role only
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view profiles without email" ON public.profiles;

-- Recreate with explicit authenticated role
CREATE POLICY "Users can only view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Super admins can view profiles without email" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (is_super_admin(auth.uid()) AND auth.uid() <> id);

-- Fix player_contacts: Add medical staff (physio, doctor) access and ensure authenticated only
DROP POLICY IF EXISTS "Only owners and admins can view player contacts" ON public.player_contacts;

-- Create more restrictive policy: only owner, admin, physio, doctor can view
CREATE POLICY "Medical staff and admins can view player contacts" 
ON public.player_contacts 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_contacts.category_id 
    AND (
      cl.user_id = auth.uid() 
      OR has_club_role(auth.uid(), cl.id, 'admin'::app_role)
      OR has_club_role(auth.uid(), cl.id, 'physio'::app_role)
      OR has_club_role(auth.uid(), cl.id, 'doctor'::app_role)
    )
  )
);

-- Update insert/update/delete policies to authenticated only
DROP POLICY IF EXISTS "Only owners and admins can insert player contacts" ON public.player_contacts;
DROP POLICY IF EXISTS "Only owners and admins can update player contacts" ON public.player_contacts;
DROP POLICY IF EXISTS "Only owners and admins can delete player contacts" ON public.player_contacts;

CREATE POLICY "Only owners and admins can insert player contacts" 
ON public.player_contacts 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_contacts.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);

CREATE POLICY "Only owners and admins can update player contacts" 
ON public.player_contacts 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_contacts.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);

CREATE POLICY "Only owners and admins can delete player contacts" 
ON public.player_contacts 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_contacts.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);