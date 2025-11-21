-- Drop existing update policy for injuries
DROP POLICY IF EXISTS "Club owners can update injuries" ON public.injuries;

-- Create new policy that allows club owners, admins and coaches to update injuries
CREATE POLICY "Club owners and staff can update injuries"
ON public.injuries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = injuries.category_id
    AND (
      clubs.user_id = auth.uid()
      OR has_club_role(auth.uid(), clubs.id, 'admin'::app_role)
      OR has_club_role(auth.uid(), clubs.id, 'coach'::app_role)
    )
  )
);

-- Also update the delete policy for consistency
DROP POLICY IF EXISTS "Club owners can delete injuries" ON public.injuries;

CREATE POLICY "Club owners and staff can delete injuries"
ON public.injuries
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = injuries.category_id
    AND (
      clubs.user_id = auth.uid()
      OR has_club_role(auth.uid(), clubs.id, 'admin'::app_role)
      OR has_club_role(auth.uid(), clubs.id, 'coach'::app_role)
    )
  )
);

-- Update insert policy too
DROP POLICY IF EXISTS "Club owners can insert injuries" ON public.injuries;

CREATE POLICY "Club owners and staff can insert injuries"
ON public.injuries
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = injuries.category_id
    AND (
      clubs.user_id = auth.uid()
      OR has_club_role(auth.uid(), clubs.id, 'admin'::app_role)
      OR has_club_role(auth.uid(), clubs.id, 'coach'::app_role)
    )
  )
);

-- Update select policy for consistency
DROP POLICY IF EXISTS "Users can view own injuries" ON public.injuries;

CREATE POLICY "Users can view injuries of accessible clubs"
ON public.injuries
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = injuries.category_id
    AND (
      clubs.user_id = auth.uid()
      OR can_access_club(auth.uid(), clubs.id)
    )
  )
);