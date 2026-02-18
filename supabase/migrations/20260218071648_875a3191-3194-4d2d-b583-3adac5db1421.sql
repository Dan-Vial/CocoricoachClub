
CREATE OR REPLACE FUNCTION public.validate_athlete_invitation(_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invitation athlete_invitations%ROWTYPE;
  v_player_name text;
  v_player_first_name text;
  v_category_name text;
  v_club_name text;
BEGIN
  SELECT * INTO v_invitation
  FROM athlete_invitations
  WHERE token = _token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Lien d''invitation invalide');
  END IF;

  IF v_invitation.status = 'accepted' THEN
    RETURN json_build_object('success', false, 'error', 'Cette invitation a déjà été utilisée. Connecte-toi à ton compte.');
  END IF;

  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Ce lien d''invitation a expiré. Contacte ton staff pour en recevoir un nouveau.');
  END IF;

  SELECT name, first_name INTO v_player_name, v_player_first_name
  FROM players WHERE id = v_invitation.player_id;

  SELECT name INTO v_category_name
  FROM categories WHERE id = v_invitation.category_id;

  SELECT name INTO v_club_name
  FROM clubs WHERE id = v_invitation.club_id;

  RETURN json_build_object(
    'success', true,
    'id', v_invitation.id,
    'email', v_invitation.email,
    'player_id', v_invitation.player_id,
    'category_id', v_invitation.category_id,
    'club_id', v_invitation.club_id,
    'status', v_invitation.status,
    'player_name', v_player_name,
    'player_first_name', v_player_first_name,
    'club_name', v_club_name,
    'category_name', v_category_name
  );
END;
$$;
