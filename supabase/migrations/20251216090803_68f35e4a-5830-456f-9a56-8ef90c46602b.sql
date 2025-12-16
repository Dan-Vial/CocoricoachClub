-- Create super_admin_users table to track super admins
CREATE TABLE public.super_admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  granted_by uuid
);

-- Enable RLS
ALTER TABLE public.super_admin_users ENABLE ROW LEVEL SECURITY;

-- Only super admins can view the super admin list
CREATE POLICY "Super admins can view super admin users"
ON public.super_admin_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.super_admin_users sa
    WHERE sa.user_id = auth.uid()
  )
);

-- Only super admins can manage super admin users
CREATE POLICY "Super admins can insert super admin users"
ON public.super_admin_users
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.super_admin_users sa
    WHERE sa.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can delete super admin users"
ON public.super_admin_users
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.super_admin_users sa
    WHERE sa.user_id = auth.uid()
  )
);

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admin_users
    WHERE user_id = _user_id
  )
$$;

-- Create view for super admins to see all clubs
CREATE OR REPLACE VIEW public.admin_all_clubs AS
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

-- Create view for super admins to see all users
CREATE OR REPLACE VIEW public.admin_all_users AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.created_at,
  (SELECT COUNT(*) FROM public.clubs cl WHERE cl.user_id = p.id) as clubs_owned,
  EXISTS (SELECT 1 FROM public.super_admin_users sa WHERE sa.user_id = p.id) as is_super_admin
FROM public.profiles p;

-- Add RLS policies for super admins to view all clubs
CREATE POLICY "Super admins can view all clubs"
ON public.clubs
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
);

-- Add RLS policies for super admins to view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
);