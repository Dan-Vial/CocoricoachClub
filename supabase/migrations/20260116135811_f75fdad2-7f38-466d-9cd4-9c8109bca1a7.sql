-- Create ambassador invitations table
CREATE TABLE public.ambassador_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  UNIQUE(token),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.ambassador_invitations ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage invitations
CREATE POLICY "Super admins can view all invitations"
ON public.ambassador_invitations
FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can create invitations"
ON public.ambassador_invitations
FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update invitations"
ON public.ambassador_invitations
FOR UPDATE
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete invitations"
ON public.ambassador_invitations
FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- Public can read their own invitation by token (for signup flow)
CREATE POLICY "Anyone can read invitation by token"
ON public.ambassador_invitations
FOR SELECT
USING (true);

-- Function to accept ambassador invitation
CREATE OR REPLACE FUNCTION public.accept_ambassador_invitation(invitation_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv_record RECORD;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Find the invitation
  SELECT * INTO inv_record
  FROM ambassador_invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > now();

  IF inv_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Mark invitation as accepted
  UPDATE ambassador_invitations
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = current_user_id
  WHERE id = inv_record.id;

  -- Add user to super_admin_users
  INSERT INTO super_admin_users (user_id, granted_by)
  VALUES (current_user_id, inv_record.invited_by)
  ON CONFLICT (user_id) DO NOTHING;

  -- Add user to approved_users with free status
  INSERT INTO approved_users (user_id, approved_by, is_free_user, notes)
  VALUES (current_user_id, inv_record.invited_by, true, 'Ambassador invitation accepted')
  ON CONFLICT (user_id) DO UPDATE SET is_free_user = true;

  -- Add admin role
  INSERT INTO user_roles (user_id, role)
  VALUES (current_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;