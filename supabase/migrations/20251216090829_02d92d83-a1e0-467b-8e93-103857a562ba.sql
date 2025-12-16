-- Fix security definer views by adding explicit RLS check in the view
DROP VIEW IF EXISTS public.admin_all_clubs;
DROP VIEW IF EXISTS public.admin_all_users;

-- Recreate views with SECURITY INVOKER (default) - they will use caller's permissions
CREATE VIEW public.admin_all_clubs 
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.name,
  c.created_at,
  c.user_id,
  p.full_name as owner_name,
  p.email as owner_email,
  (SELECT COUNT(*) FROM public.categories cat WHERE cat.club_id = c.id) as category_count,
  (SELECT COUNT(*) FROM public.club_members cm WHERE cm.club_id = c.id) as member_count
FROM public.clubs c
LEFT JOIN public.profiles p ON p.id = c.user_id;

CREATE VIEW public.admin_all_users 
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.created_at,
  (SELECT COUNT(*) FROM public.clubs cl WHERE cl.user_id = p.id) as clubs_owned,
  EXISTS (SELECT 1 FROM public.super_admin_users sa WHERE sa.user_id = p.id) as is_super_admin
FROM public.profiles p;