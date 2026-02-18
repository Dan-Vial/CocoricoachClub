
-- Update can_access_club to also allow category members to see the club
CREATE OR REPLACE FUNCTION public.can_access_club(_user_id uuid, _club_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    -- Direct club member
    SELECT 1
    FROM public.club_members
    WHERE user_id = _user_id
      AND club_id = _club_id
  ) OR EXISTS (
    -- Club owner
    SELECT 1
    FROM public.clubs
    WHERE id = _club_id
      AND user_id = _user_id
  ) OR EXISTS (
    -- Category member (e.g. athlete) in any category of this club
    SELECT 1
    FROM public.category_members cm
    JOIN public.categories c ON c.id = cm.category_id
    WHERE cm.user_id = _user_id
      AND c.club_id = _club_id
  )
$$;
