-- Mettre à jour la fonction accept_category_invitation pour accepter n'importe quel utilisateur connecté
-- (pas de vérification d'email, le lien lui-même est la preuve d'autorisation)
CREATE OR REPLACE FUNCTION public.accept_category_invitation(_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invitation category_invitations%ROWTYPE;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Trouver l'invitation sans vérifier l'email
  SELECT * INTO v_invitation
  FROM category_invitations
  WHERE token = _token
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Ajouter l'utilisateur comme membre de la catégorie avec le bon rôle
  INSERT INTO category_members (category_id, user_id, role, invited_by)
  VALUES (v_invitation.category_id, v_user_id, v_invitation.role, v_invitation.invited_by)
  ON CONFLICT (category_id, user_id) DO UPDATE SET role = v_invitation.role;

  -- Marquer l'invitation comme acceptée
  UPDATE category_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  RETURN json_build_object('success', true, 'category_id', v_invitation.category_id);
END;
$function$;

-- Même chose pour les invitations club
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

  -- Trouver l'invitation sans vérifier l'email
  SELECT * INTO v_invitation
  FROM club_invitations
  WHERE token = _token
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Ajouter l'utilisateur comme membre du club avec le bon rôle
  INSERT INTO club_members (club_id, user_id, role, invited_by)
  VALUES (v_invitation.club_id, v_user_id, v_invitation.role, v_invitation.invited_by)
  ON CONFLICT (club_id, user_id) DO UPDATE SET role = v_invitation.role;

  -- Marquer l'invitation comme acceptée
  UPDATE club_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  RETURN json_build_object('success', true, 'club_id', v_invitation.club_id);
END;
$function$;