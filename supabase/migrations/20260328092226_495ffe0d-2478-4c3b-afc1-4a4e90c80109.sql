
CREATE OR REPLACE FUNCTION public.accept_athlete_invitation_signup(_token text, _user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invitation athlete_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_invitation
  FROM athlete_invitations
  WHERE token = _token AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation invalide ou déjà utilisée');
  END IF;

  -- Auto-approve the athlete user
  INSERT INTO approved_users (user_id, approved_by, notes)
  VALUES (_user_id, v_invitation.invited_by, 'Auto-approved via athlete invitation')
  ON CONFLICT (user_id) DO NOTHING;

  -- Link player to user
  UPDATE players SET user_id = _user_id WHERE id = v_invitation.player_id;

  -- Add as category member with athlete role
  INSERT INTO category_members (category_id, user_id, role, invited_by)
  VALUES (v_invitation.category_id, _user_id, 'athlete', v_invitation.invited_by)
  ON CONFLICT (category_id, user_id) DO UPDATE SET role = 'athlete';

  -- Mark invitation as accepted
  UPDATE athlete_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN json_build_object('success', true);
END;
$function$;
