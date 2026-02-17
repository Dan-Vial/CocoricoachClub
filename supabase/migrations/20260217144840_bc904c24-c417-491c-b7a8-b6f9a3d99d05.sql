-- Add assigned_categories to club_invitations
ALTER TABLE public.club_invitations 
ADD COLUMN assigned_categories text[] DEFAULT NULL;

-- Update accept_club_invitation to pass assigned_categories
CREATE OR REPLACE FUNCTION public.accept_club_invitation(_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invitation club_invitations%ROWTYPE;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_invitation
  FROM club_invitations
  WHERE token = _token
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  INSERT INTO club_members (club_id, user_id, role, invited_by, assigned_categories)
  VALUES (v_invitation.club_id, v_user_id, v_invitation.role, v_invitation.invited_by, v_invitation.assigned_categories)
  ON CONFLICT (club_id, user_id) DO UPDATE SET role = v_invitation.role, assigned_categories = v_invitation.assigned_categories;

  UPDATE club_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  RETURN json_build_object('success', true, 'club_id', v_invitation.club_id);
END;
$function$;