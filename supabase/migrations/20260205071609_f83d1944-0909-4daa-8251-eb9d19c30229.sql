-- Add category restrictions to club_members
-- This allows club members to be restricted to specific categories

ALTER TABLE public.club_members
ADD COLUMN IF NOT EXISTS assigned_categories uuid[] DEFAULT NULL;

COMMENT ON COLUMN public.club_members.assigned_categories IS 'List of category IDs this member can access. NULL = access to all categories';

-- Update can_access_category function to check assigned_categories
CREATE OR REPLACE FUNCTION public.can_access_category(_user_id uuid, _category_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Check if user owns the club
  SELECT EXISTS (
    SELECT 1
    FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = _category_id
      AND cl.user_id = _user_id
  )
  OR 
  -- Check if user is a club member with access to this category
  EXISTS (
    SELECT 1
    FROM public.categories c
    JOIN public.club_members cm ON cm.club_id = c.club_id
    WHERE c.id = _category_id
      AND cm.user_id = _user_id
      AND (
        cm.assigned_categories IS NULL 
        OR _category_id = ANY(cm.assigned_categories)
      )
  )
  OR
  -- Check if user is a direct category member
  EXISTS (
    SELECT 1
    FROM public.category_members
    WHERE category_id = _category_id
      AND user_id = _user_id
  )
$$;