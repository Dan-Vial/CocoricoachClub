-- =============================================================
-- FIX 1: MEDICAL RECORDS - Restrict to medical staff only
-- =============================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view medical records for their categories" ON public.medical_records;
DROP POLICY IF EXISTS "Users can manage medical records for their categories" ON public.medical_records;

-- SELECT - only owners, admins, physio, doctor
CREATE POLICY "Medical staff can view medical records"
ON public.medical_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = medical_records.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

-- INSERT - only owners, admins, physio, doctor
CREATE POLICY "Medical staff can insert medical records"
ON public.medical_records
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = medical_records.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

-- UPDATE - only owners, admins, physio, doctor
CREATE POLICY "Medical staff can update medical records"
ON public.medical_records
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = medical_records.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

-- DELETE - only owners, admins, physio, doctor
CREATE POLICY "Medical staff can delete medical records"
ON public.medical_records
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = medical_records.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

-- =============================================================
-- FIX 2: PLAYERS TABLE - Restrict personal data access
-- Create a function to check if user can view sensitive player data
-- =============================================================

CREATE OR REPLACE FUNCTION public.can_view_player_sensitive_data(_user_id uuid, _category_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Club owner
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = _category_id AND cl.user_id = _user_id
  ) OR EXISTS (
    -- Club admin
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    JOIN public.club_members cm ON cm.club_id = cl.id
    WHERE c.id = _category_id 
    AND cm.user_id = _user_id 
    AND cm.role = 'admin'
  ) OR EXISTS (
    -- Medical staff (physio, doctor)
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    JOIN public.club_members cm ON cm.club_id = cl.id
    WHERE c.id = _category_id 
    AND cm.user_id = _user_id 
    AND cm.role IN ('physio', 'doctor')
  )
$$;

-- Drop the old permissive policy on players
DROP POLICY IF EXISTS "Enable all operations for everyone" ON public.players;
DROP POLICY IF EXISTS "Users can view players in their categories" ON public.players;
DROP POLICY IF EXISTS "Users can manage players in their categories" ON public.players;

-- SELECT - All staff can see basic player info, but sensitive data is filtered at app level
-- However, for RLS we restrict who can see the data
CREATE POLICY "Staff can view players in their categories"
ON public.players
FOR SELECT
USING (can_access_category(auth.uid(), category_id));

-- INSERT - Only owners and admins can add players
CREATE POLICY "Owners and admins can insert players"
ON public.players
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = players.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);

-- UPDATE - Only owners and admins can update players
CREATE POLICY "Owners and admins can update players"
ON public.players
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = players.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);

-- DELETE - Only owners and admins can delete players
CREATE POLICY "Owners and admins can delete players"
ON public.players
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = players.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);