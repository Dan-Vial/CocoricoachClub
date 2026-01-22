-- Fix: allow club admins/coaches to create/update/delete categories (not only club owner)
-- Existing function public.can_modify_club_data(_user_id uuid, _club_id uuid) is used to avoid RLS recursion.

-- Drop restrictive owner-only policies
DROP POLICY IF EXISTS "Club owners can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Club owners can update categories" ON public.categories;
DROP POLICY IF EXISTS "Club owners can delete categories" ON public.categories;

-- Insert: club owner OR club member with role admin/coach (via can_modify_club_data)
CREATE POLICY "Club members with access can insert categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_modify_club_data(auth.uid(), club_id)
);

-- Update
CREATE POLICY "Club members with access can update categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (
  public.can_modify_club_data(auth.uid(), club_id)
)
WITH CHECK (
  public.can_modify_club_data(auth.uid(), club_id)
);

-- Delete
CREATE POLICY "Club members with access can delete categories"
ON public.categories
FOR DELETE
TO authenticated
USING (
  public.can_modify_club_data(auth.uid(), club_id)
);
