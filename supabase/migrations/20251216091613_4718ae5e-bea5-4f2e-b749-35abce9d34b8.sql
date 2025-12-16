-- Create approved_users table to track which users can create clubs
CREATE TABLE public.approved_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  approved_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_by uuid,
  notes text
);

-- Enable RLS
ALTER TABLE public.approved_users ENABLE ROW LEVEL SECURITY;

-- Super admins can view approved users
CREATE POLICY "Super admins can view approved users"
ON public.approved_users
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
);

-- Super admins can manage approved users
CREATE POLICY "Super admins can insert approved users"
ON public.approved_users
FOR INSERT
WITH CHECK (
  public.is_super_admin(auth.uid())
);

CREATE POLICY "Super admins can delete approved users"
ON public.approved_users
FOR DELETE
USING (
  public.is_super_admin(auth.uid())
);

-- Users can check their own approval status
CREATE POLICY "Users can view own approval status"
ON public.approved_users
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_approved_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.approved_users
    WHERE user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.super_admin_users
    WHERE user_id = _user_id
  )
$$;

-- Drop existing insert policy on clubs
DROP POLICY IF EXISTS "Users can insert own clubs" ON public.clubs;

-- Create new policy that requires approval
CREATE POLICY "Approved users can insert clubs"
ON public.clubs
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND public.is_approved_user(auth.uid())
);

-- Add you (existing super admin) to approved users automatically
INSERT INTO public.approved_users (user_id, approved_by, notes)
SELECT sa.user_id, sa.user_id, 'Auto-approved as super admin'
FROM public.super_admin_users sa
ON CONFLICT (user_id) DO NOTHING;