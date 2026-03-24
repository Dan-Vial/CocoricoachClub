-- Tighten access to sensitive player data

-- Ensure role-based helper includes super-admin override
CREATE OR REPLACE FUNCTION public.can_view_player_sensitive_data(_user_id uuid, _category_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Club owner
    SELECT 1
    FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = _category_id
      AND cl.user_id = _user_id
  ) OR EXISTS (
    -- Club admin
    SELECT 1
    FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    JOIN public.club_members cm ON cm.club_id = cl.id
    WHERE c.id = _category_id
      AND cm.user_id = _user_id
      AND cm.role = 'admin'
  ) OR EXISTS (
    -- Medical staff
    SELECT 1
    FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    JOIN public.club_members cm ON cm.club_id = cl.id
    WHERE c.id = _category_id
      AND cm.user_id = _user_id
      AND cm.role IN ('physio', 'doctor')
  ) OR public.is_super_admin(_user_id)
$$;

-- Remove broad SELECT policy that exposed sensitive columns to all category members
DROP POLICY IF EXISTS "Authenticated users can view players in accessible categories" ON public.players;

-- Restrict SELECT to admins/medical/super-admin + athlete owner of their own row
CREATE POLICY "Restricted player select for sensitive data"
ON public.players
FOR SELECT
TO authenticated
USING (
  public.can_view_player_sensitive_data(auth.uid(), category_id)
  OR user_id = auth.uid()
);
