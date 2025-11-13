-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'coach', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create club_members table for collaboration
CREATE TABLE public.club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);

ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- Create invitations table
CREATE TABLE public.club_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.club_invitations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has role for a club
CREATE OR REPLACE FUNCTION public.has_club_role(_user_id UUID, _club_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_members
    WHERE user_id = _user_id
      AND club_id = _club_id
      AND role = _role
  ) OR EXISTS (
    SELECT 1
    FROM public.clubs
    WHERE id = _club_id
      AND user_id = _user_id
  )
$$;

-- Security definer function to check if user can access club
CREATE OR REPLACE FUNCTION public.can_access_club(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_members
    WHERE user_id = _user_id
      AND club_id = _club_id
  ) OR EXISTS (
    SELECT 1
    FROM public.clubs
    WHERE id = _club_id
      AND user_id = _user_id
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for club_members
CREATE POLICY "Club members can view other members"
  ON public.club_members
  FOR SELECT
  USING (public.can_access_club(auth.uid(), club_id));

CREATE POLICY "Club owners and admins can insert members"
  ON public.club_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clubs 
      WHERE id = club_id AND user_id = auth.uid()
    ) OR 
    public.has_club_role(auth.uid(), club_id, 'admin')
  );

CREATE POLICY "Club owners and admins can update members"
  ON public.club_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs 
      WHERE id = club_id AND user_id = auth.uid()
    ) OR 
    public.has_club_role(auth.uid(), club_id, 'admin')
  );

CREATE POLICY "Club owners and admins can delete members"
  ON public.club_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs 
      WHERE id = club_id AND user_id = auth.uid()
    ) OR 
    public.has_club_role(auth.uid(), club_id, 'admin')
  );

-- RLS Policies for club_invitations
CREATE POLICY "Users can view invitations they sent or received"
  ON public.club_invitations
  FOR SELECT
  USING (
    auth.uid() = invited_by OR
    auth.email() = email OR
    public.can_access_club(auth.uid(), club_id)
  );

CREATE POLICY "Club owners and admins can create invitations"
  ON public.club_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clubs 
      WHERE id = club_id AND user_id = auth.uid()
    ) OR 
    public.has_club_role(auth.uid(), club_id, 'admin')
  );

CREATE POLICY "Club owners and admins can update invitations"
  ON public.club_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs 
      WHERE id = club_id AND user_id = auth.uid()
    ) OR 
    public.has_club_role(auth.uid(), club_id, 'admin') OR
    auth.email() = email
  );

CREATE POLICY "Club owners and admins can delete invitations"
  ON public.club_invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs 
      WHERE id = club_id AND user_id = auth.uid()
    ) OR 
    public.has_club_role(auth.uid(), club_id, 'admin')
  );

-- Update clubs RLS to include members
DROP POLICY IF EXISTS "Users can view own clubs" ON public.clubs;
CREATE POLICY "Users can view own clubs and clubs they're members of"
  ON public.clubs
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    public.can_access_club(auth.uid(), id)
  );

-- Update categories RLS to include club members
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view categories of accessible clubs"
  ON public.categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = categories.club_id
      AND (clubs.user_id = auth.uid() OR public.can_access_club(auth.uid(), clubs.id))
    )
  );

-- Similar updates for other tables (players, awcr_tracking, etc.)
DROP POLICY IF EXISTS "Users can view own players" ON public.players;
CREATE POLICY "Users can view players of accessible clubs"
  ON public.players
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN clubs ON clubs.id = categories.club_id
      WHERE categories.id = players.category_id
      AND (clubs.user_id = auth.uid() OR public.can_access_club(auth.uid(), clubs.id))
    )
  );

-- Function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_club_invitation(_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation club_invitations%ROWTYPE;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get invitation
  SELECT * INTO v_invitation
  FROM club_invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now()
    AND email = auth.email();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Add user to club_members
  INSERT INTO club_members (club_id, user_id, role, invited_by)
  VALUES (v_invitation.club_id, v_user_id, v_invitation.role, v_invitation.invited_by)
  ON CONFLICT (club_id, user_id) DO NOTHING;

  -- Update invitation status
  UPDATE club_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  RETURN json_build_object('success', true, 'club_id', v_invitation.club_id);
END;
$$;