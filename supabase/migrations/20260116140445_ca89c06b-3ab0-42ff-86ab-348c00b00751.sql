-- Remove expiration for ambassador invitations
ALTER TABLE public.ambassador_invitations 
ALTER COLUMN expires_at DROP NOT NULL,
ALTER COLUMN expires_at SET DEFAULT NULL;

-- Update existing pending invitations to have no expiration
UPDATE public.ambassador_invitations 
SET expires_at = NULL 
WHERE status = 'pending';

-- Update the accept function to not check expiration
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

  -- Find the invitation (no expiration check)
  SELECT * INTO inv_record
  FROM ambassador_invitations
  WHERE token = invitation_token
    AND status = 'pending';

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